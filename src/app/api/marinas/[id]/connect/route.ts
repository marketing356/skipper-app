/**
 * POST /api/marinas/[id]/connect — Send a connection request to a marina via Railway (Rule 2)
 * Auth: boater identified by auth_user_id in body (forwarded as X-Boater-Auth).
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
    const res = await fetch(`${E}/api/v1/boater/marinas/${params.id}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
