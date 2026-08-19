/**
 * POST /api/transient-requests/[id]/checkout-early — Boater currently checked in leaves
 * before their scheduled departure date, via Railway (Rule 2). Body: { auth_user_id }.
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
    const res = await fetch(`${E}/api/v1/boater/transient-requests/${params.id}/checkout-early`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
