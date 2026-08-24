/**
 * GET  /api/assets?tenant_id=... — List all vessels for a boater via Railway (Rule 2 compliant)
 * POST /api/assets — Create a new vessel via Railway (Rule 2 compliant)
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const authUserId = url.searchParams.get('auth_user_id') || ''
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels`, {
    cache: 'no-store', headers: { ...H(), 'x-boater-auth': authUserId } })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const authUserId = body.auth_user_id || ''
    if (!authUserId) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/vessels`, {
    cache: 'no-store', method: 'POST', headers: { ...H(), 'x-boater-auth': authUserId }, body: JSON.stringify(body) })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
