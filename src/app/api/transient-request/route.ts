/**
 * POST /api/transient-request — Submit transient slip request via Railway (Rule 2 compliant)
 */
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const H = () => ({ 'Content-Type': 'application/json' })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const marina_id = body.marina_id
    if (!marina_id) return NextResponse.json({ error: 'marina_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/marina/${marina_id}/transient-requests`, {
    cache: 'no-store',
      method: 'POST', headers: H(), body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
