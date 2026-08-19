/**
 * GET /api/transient-requests/[id]/folio?auth_user_id=... — Boater's checkout folio (outstanding
 * dockage + ancillary dock charges to settle) via Railway (Rule 2).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUserId = new URL(req.url).searchParams.get('auth_user_id')
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/transient-requests/${params.id}/folio`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': authUserId },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
