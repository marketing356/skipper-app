/**
 * GET /api/my-marinas?auth_user_id=... — Marinas this boater is connected to, with
 * per-marina tenant type + contact id, via Railway (Rule 2). Replaces direct Supabase
 * reads of contacts/marinas/leases/transient_requests from the global Skipper loader.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const auth_user_id = new URL(req.url).searchParams.get('auth_user_id')
    if (!auth_user_id) return NextResponse.json({ marinas: [] }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/my-marinas`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ marinas: [], error: String(err) }, { status: 500 })
  }
}
