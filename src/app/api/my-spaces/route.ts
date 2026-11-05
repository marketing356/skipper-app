/**
 * GET /api/my-spaces?auth_user_id=...&marina_id=...  - this boater's OWN spaces at a marina (slip, yard trailer,
 * mooring, booked transient slip) so the marina map can light them up. Thin proxy to Railway; no logic here.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const auth_user_id = sp.get('auth_user_id')
  const marina_id = sp.get('marina_id')
  if (!auth_user_id) return NextResponse.json({ spaces: [] }, { status: 400 })
  try {
    const res = await fetch(E + '/api/v1/boater/my-spaces' + (marina_id ? '?marina_id=' + encodeURIComponent(marina_id) : ''), {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
    })
    return NextResponse.json(await res.json().catch(() => ({ spaces: [] })), { status: res.status })
  } catch (err) {
    return NextResponse.json({ spaces: [], error: String(err) }, { status: 502 })
  }
}
