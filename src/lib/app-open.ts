/**
 * Real-time app status (Mike, 2026-10-30).
 *
 * Every time a boater opens the app we record which device/app they are on NOW,
 * so a switch iPhone <-> Android updates automatically (latest device wins).
 *   - native App Store app (UA "AyeAyeSkipperMarina/<n> CFNetwork/... Darwin/...") = iPhone = 'ios'
 *   - mobile web app in a browser (UA "Mozilla/5.0 ...")                            = 'android'
 *
 * recordAppOpen() is safe to call on every open:
 *   - never inserts rows (no duplicates), never clears a field
 *   - links auth_user_id only where it is still empty (same rule as link-contact)
 *   - skips rows already linked to a DIFFERENT login
 *   - writes nothing when nothing changed and last-seen is fresh (keeps realtime quiet
 *     and prevents a write -> broadcast -> refetch -> write loop)
 */

export type AppPlatform = 'ios' | 'android'
export type AppDisplayMode = 'native' | 'standalone' | 'browser'

/** Same rule as link-contact (commit ee0b31b): native iOS app UA -> ios, anything else -> android. */
export function isNativeIosUserAgent(ua: string | null | undefined): boolean {
  const s = ua ?? ''
  return !/Mozilla/i.test(s) && /CFNetwork|Darwin\//i.test(s)
}

export function platformFromUserAgent(ua: string | null | undefined): AppPlatform {
  return isNativeIosUserAgent(ua) ? 'ios' : 'android'
}

// Re-write last-seen at most this often when nothing else changed.
const LAST_SEEN_REFRESH_MS = 10 * 60 * 1000

type OpenRow = {
  id: string
  marina_id: string | null
  email: string | null
  auth_user_id: string | null
  platform: string | null
  app_display_mode: string | null
  app_last_seen_at: string | null
  app_icon_installed_at: string | null
}

export async function recordAppOpen(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  opts: {
    userId: string
    email?: string | null
    platform: AppPlatform
    displayMode?: AppDisplayMode | null
    installed?: boolean
  },
): Promise<{ rows: number; updated: number; linked: number }> {
  const { userId, platform } = opts
  const displayMode = opts.displayMode ?? null
  const email = (opts.email ?? '').trim().toLowerCase()
  const cols = 'id, marina_id, email, auth_user_id, platform, app_display_mode, app_last_seen_at, app_icon_installed_at'

  // Rows already linked to this login + (if we know the verified email) rows for that email.
  const queries = [
    admin.from('contacts').select(cols).eq('auth_user_id', userId).is('deleted_at', null),
  ]
  if (email && email.includes('@')) {
    queries.push(admin.from('contacts').select(cols).eq('email', email).is('deleted_at', null))
  }
  const results = await Promise.all(queries)
  const byId = new Map<string, OpenRow>()
  for (const r of results) {
    if (r.error) throw new Error(r.error.message)
    for (const row of (r.data ?? []) as OpenRow[]) byId.set(row.id, row)
  }

  const now = new Date()
  const nowIso = now.toISOString()
  let updated = 0
  let linked = 0

  for (const row of Array.from(byId.values())) {
    // Never touch a row that belongs to a different login.
    if (row.auth_user_id && row.auth_user_id !== userId) continue

    const patch: Record<string, unknown> = {}
    if (!row.auth_user_id) {
      patch.auth_user_id = userId
      // Marina-scoped rows: same as link-contact (pre-loaded boater skips onboarding).
      if (row.marina_id) patch.setup_complete = true
      linked++
    }
    if (row.platform !== platform) patch.platform = platform
    if (displayMode && row.app_display_mode !== displayMode) patch.app_display_mode = displayMode
    if (!row.app_icon_installed_at && (opts.installed || displayMode === 'standalone')) {
      patch.app_icon_installed_at = nowIso
    }
    const lastSeen = row.app_last_seen_at ? Date.parse(row.app_last_seen_at) : 0
    const stale = !lastSeen || now.getTime() - lastSeen > LAST_SEEN_REFRESH_MS
    if (Object.keys(patch).length === 0 && !stale) continue
    patch.app_last_seen_at = nowIso

    let q = admin.from('contacts').update(patch).eq('id', row.id)
    // Guard against a race: only link if still unlinked (or already ours).
    q = row.auth_user_id ? q.eq('auth_user_id', userId) : q.is('auth_user_id', null)
    const { error } = await q
    if (error) throw new Error(error.message)
    updated++
  }

  return { rows: byId.size, updated, linked }
}
