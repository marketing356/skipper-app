/**
 * /api/messages — Boater messages proxy through Railway (Rule 2 compliant)
 * Uses /boater/messages endpoint with X-Boater-Auth header
 * GET ?auth_user_id=...  → load thread for this boater
 * POST { auth_user_id, body }  → send message to marina
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  const auth_user_id = new URL(req.url).searchParams.get('auth_user_id')
  if (!auth_user_id) return NextResponse.json({ messages: [] }, { status: 400 })
  const res = await fetch(`${E}/api/v1/boater/messages`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-skipper-api-key': K,
      'x-boater-auth': auth_user_id,
    },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(req: NextRequest) {
  const { auth_user_id, body } = await req.json()
  if (!auth_user_id || !body) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  const res = await fetch(`${E}/api/v1/boater/messages`, {
    cache: 'no-store',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-skipper-api-key': K,
      'x-boater-auth': auth_user_id,
    },
    body: JSON.stringify({ body }),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
