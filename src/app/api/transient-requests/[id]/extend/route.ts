/**
 * POST /api/transient-requests/[id]/extend — Boater extends their own upcoming/current
 * transient stay via Railway (Rule 2). Body: { auth_user_id, new_end_date }.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const authUserId = body.auth_user_id
    const newEndDate = body.new_end_date
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    if (!newEndDate) return NextResponse.json({ error: 'new_end_date required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/transient-requests/${params.id}/extend`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
      body: JSON.stringify({ new_end_date: newEndDate }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
