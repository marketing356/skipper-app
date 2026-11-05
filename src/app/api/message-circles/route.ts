/**
 * GET /api/message-circles?auth_user_id=...&marina_id=...  - the message circles this marina has turned on
 * (Office always), with the boater's unread count per circle. Thin proxy to Railway; no logic here.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const auth_user_id = sp.get('auth_user_id')
  const marina_id = sp.get('marina_id')
  if (!auth_user_id) return NextResponse.json({ circles: [] }, { status: 400 })
  try {
    const res = await fetch(E + '/api/v1/boater/message-circles' + (marina_id ? '?marina_id=' + encodeURIComponent(marina_id) : ''), {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
    })
    return NextResponse.json(await res.json().catch(() => ({ circles: [] })), { status: res.status })
  } catch (err) {
    return NextResponse.json({ circles: [], error: String(err) }, { status: 502 })
  }
}
