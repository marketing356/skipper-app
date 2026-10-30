/**
 * PATCH /api/profile — Update boater contact record via Railway (Rule 2 compliant)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isNativeIosUserAgent, recordAppOpen } from '@/lib/app-open'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })

export async function GET(req: NextRequest) {
  try {
    const auth_user_id = new URL(req.url).searchParams.get('auth_user_id')
    if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    // Real-time app status (Mike, 2026-10-30): the native iPhone app (build 28+) loads this
    // profile on every open/foreground (Vercel request logs, UA "AyeAyeSkipperMarina/28
    // CFNetwork Darwin"). Record "on the iPhone app now" from that call. Native-iOS UA only;
    // the web app reports via /api/auth/app-open. Throttled + never inserts/wipes (lib/app-open).
    // Best-effort: a failure here never affects the profile response.
    const appOpen = isNativeIosUserAgent(req.headers.get('user-agent'))
      ? recordAppOpen(supabaseAdmin, { userId: auth_user_id, platform: 'ios', displayMode: 'native' })
          .catch(e => console.error('[profile] native app-open record failed:', e))
      : Promise.resolve()
    const [res] = await Promise.all([
      fetch(`${E}/api/v1/boater/profile`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
      }),
      appOpen,
    ])
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/profile`, { method: 'PATCH', headers: { ...H(), 'x-boater-auth': body.auth_user_id }, body: JSON.stringify(body) })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
