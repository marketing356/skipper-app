/**
 * PATCH  /api/vessels/[id] — Update this boater's vessel via Railway (Rule 2)
 * DELETE /api/vessels/[id] — Soft-delete this boater's vessel via Railway (Rule 2)
 * Auth: boater identified by auth_user_id in body (forwarded as X-Boater-Auth).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUserId = new URL(req.url).searchParams.get('auth_user_id')
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}`, {
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const authUserId = body.auth_user_id
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}`, {
      method: 'PATCH',
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
    // Mike 2026-11-14: a boat with an ACTIVE LEASE cannot be deleted by the customer (it would also vanish from the marina's records).
    // Fail closed: if we cannot check the leases, do not delete.
    try {
      const br = await fetch(`${E}/api/v1/boater/berths`, { cache: 'no-store', headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId } })
      if (!br.ok) return NextResponse.json({ error: 'Could not check this boat for an active lease. Please try again.', code: 'lease_check_failed' }, { status: 503 })
      const bd = await br.json()
      const list = Array.isArray(bd) ? bd : (bd?.berths ?? [])
      if (list.some((x: { assetId?: string | null }) => x?.assetId === params.id)) {
        return NextResponse.json({ error: 'This boat has an active lease and cannot be deleted. Ask your marina to end the lease first.', code: 'active_lease' }, { status: 409 })
      }
    } catch {
      return NextResponse.json({ error: 'Could not check this boat for an active lease. Please try again.', code: 'lease_check_failed' }, { status: 503 })
    }
    const res = await fetch(`${E}/api/v1/boater/vessels/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
