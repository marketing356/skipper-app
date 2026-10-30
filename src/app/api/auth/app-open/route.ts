import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { platformFromUserAgent, recordAppOpen, type AppDisplayMode } from '@/lib/app-open'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/app-open
 *
 * Real-time app status (Mike, 2026-10-30). The web app calls this once per launch after
 * ANY successful sign-in (email code, PIN "Welcome back", or session already open), and
 * again when the browser fires 'appinstalled'. Records which device/app the boater is on
 * NOW: platform from the caller (browser -> android, native iOS app -> ios), display mode
 * (standalone = opened from the home-screen icon, browser = browser tab), last-seen time.
 *
 * Identity comes ONLY from the caller's Supabase access token (Authorization: Bearer),
 * never from the body. Safe to call every open: no inserts, no wipes (see recordAppOpen).
 *
 * Body (optional): { displayMode?: 'standalone' | 'browser', event?: 'open' | 'installed' }
 */
export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') ?? ''
    const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : ''
    if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const rawMode = body?.displayMode
    const displayMode: AppDisplayMode | null =
      rawMode === 'standalone' || rawMode === 'browser' ? rawMode : null
    const installed = body?.event === 'installed'

    const result = await recordAppOpen(admin, {
      userId: user.id,
      email: user.email ?? null,
      platform: platformFromUserAgent(req.headers.get('user-agent')),
      displayMode,
      installed,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
