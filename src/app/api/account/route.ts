import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

/**
 * GET /api/account?auth_user_id=... - this boater's own national-pool contact row via Railway.
 * (Restored 2026-11-07: the DELETE commit had replaced this GET, so the Account/Edit Profile screen got HTTP 405
 * and showed every field empty.)
 */
export async function GET(req: NextRequest) {
  try {
    const auth_user_id = new URL(req.url).searchParams.get('auth_user_id')
    if (!auth_user_id) return NextResponse.json({ contact: null }, { status: 400 })
    const res = await fetch(E + '/api/v1/boater/account', {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ contact: null, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get('x-boater-auth') || ''
    if (!auth) return NextResponse.json({ error: 'x-boater-auth required' }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/account`, {
      method: 'DELETE',
      headers: { 'x-skipper-api-key': K, 'x-boater-auth': auth },
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
