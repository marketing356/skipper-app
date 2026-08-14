/**
 * POST /api/marinas/[id]/transient-moorings/[mooringId]/instant-book
 * Rule 2 compliant — proxies to Railway. Railway re-verifies fit (weight, LOA, air
 * draft, draft only) and date availability atomically, creates the reservation +
 * invoice, returns checkout_url.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function POST(req: NextRequest, { params }: { params: { id: string; mooringId: string } }) {
  try {
    const body = await req.json()
    const { auth_user_id, check_in, check_out, vessel_id } = body
    if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    if (!check_in || !check_out || !vessel_id) return NextResponse.json({ error: 'check_in, check_out, vessel_id required' }, { status: 400 })

    const res = await fetch(`${E}/api/v1/marina/${params.id}/transient-moorings/${params.mooringId}/instant-book`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-skipper-api-key': K,
        'x-boater-auth':     auth_user_id,
      },
      body: JSON.stringify({ check_in, check_out, vessel_id }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
