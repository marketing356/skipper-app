'use client'
/**
 * Real-time app status, browser side (Mike, 2026-10-30).
 * Reports "boater opened the app on this device" to /api/auth/app-open:
 *   - once per launch after any successful sign-in (email code, PIN, session already open)
 *   - when the app comes back to the foreground (at most every 2 minutes)
 *   - when the browser fires 'appinstalled' (Add to Home Screen)
 * Display mode per web.dev "Learn PWA: Detection": standalone = opened from the
 * home-screen icon, browser = a browser tab. Identity = the Supabase session token only.
 * Never throws; never blocks sign-in.
 */
import { supabase } from '@/lib/supabase-client'

type AppOpenEvent = 'open' | 'resume' | 'installed'

const RESUME_MIN_GAP_MS = 2 * 60 * 1000
let lastReport: { uid: string; at: number } | null = null
let openInFlight = false

export function currentDisplayMode(): 'standalone' | 'browser' {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'standalone'
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'standalone'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).standalone === true) return 'standalone' // iOS Safari home-screen icon
  } catch { /* ignore */ }
  return 'browser'
}

export async function reportAppOpen(event: AppOpenEvent = 'open'): Promise<void> {
  if (event === 'open') {
    if (openInFlight) return // two sign-in hooks can fire together; send one report
    openInFlight = true
  }
  try {
    if (typeof window === 'undefined') return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const uid = session?.user?.id
    if (!token || !uid) return
    if (event !== 'installed') {
      const same = lastReport && lastReport.uid === uid
      if (same && event === 'open') return // once per launch
      if (same && Date.now() - lastReport!.at < RESUME_MIN_GAP_MS) return
      lastReport = { uid, at: Date.now() }
    }
    await fetch('/api/auth/app-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayMode: currentDisplayMode(), event: event === 'installed' ? 'installed' : 'open' }),
      keepalive: true,
    })
  } catch { /* best-effort */ } finally {
    if (event === 'open') openInFlight = false
  }
}
