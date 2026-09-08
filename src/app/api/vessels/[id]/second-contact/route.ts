/**
 * Second vessel contact (captain/operator) — proxied to Railway (Rule 2).
 * A vessel can have up to two contacts: the primary owner and one second contact.
 *   GET    /api/vessels/[id]/second-contact?auth_user_id=... — view the second contact (or null)
 *   POST   /api/vessels/[id]/second-contact — owner delegates access by adding a captain
 *   DELETE /api/vessels/[id]/second-contact — owner removes the second contact
 * Auth: boater identified by auth_user_id (forwarded as X-Boater-Auth to the engine).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUserId = new URL(req.url).searchParams.get('auth_user_id')
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}/second-contact`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const authUserId = body.auth_user_id
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}/second-contact`, {
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}))
    const authUserId = body.auth_user_id || new URL(req.url).searchParams.get('auth_user_id')
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}/second-contact`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
