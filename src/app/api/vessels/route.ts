/**
 * GET  /api/vessels?auth_user_id=... — List this boater's vessels via Railway (Rule 2)
 * POST /api/vessels — Create a vessel for this boater via Railway (Rule 2)
 * Auth: boater is identified by auth_user_id (forwarded as X-Boater-Auth to the engine).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const authUserId = new URL(req.url).searchParams.get('auth_user_id')
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels`, {
    cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const authUserId = body.auth_user_id
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels`, {
    cache: 'no-store',
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
