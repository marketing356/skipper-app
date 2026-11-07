/**
 * POST /api/transient-requests/[id]/modify - change my dates (pay the difference or get a refund)
 * Forwards to the engine (single source). Body: { auth_user_id, ...fields }.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const authUserId = body.auth_user_id
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const { auth_user_id: _a, ...rest } = body
    const res = await fetch(E + '/api/v1/boater/transient-requests/' + params.id + '/modify', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
      body: JSON.stringify(rest),
    })
    const data = await res.json().catch(() => ({ error: 'Bad response from server' }))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
