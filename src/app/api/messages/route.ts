/**
 * /api/messages — Boater messages proxy through Railway (Rule 2 compliant)
 * Uses /boater/messages endpoint with X-Boater-Auth header
 * GET ?auth_user_id=...&marina_id=...  → load thread for this boater at THAT marina
 * POST { auth_user_id, body, marina_id? }  → send message to THAT marina (2026-10-30: the picked
 *      marina is forwarded; a boater not linked yet is never locked out). Engine errors are passed
 *      through with their status so the app can show "not sent" + Retry.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const auth_user_id = sp.get('auth_user_id')
  const marina_id = sp.get('marina_id')
  if (!auth_user_id) return NextResponse.json({ messages: [] }, { status: 400 })
  try {
    const res = await fetch(`${E}/api/v1/boater/messages${marina_id ? `?marina_id=${encodeURIComponent(marina_id)}` : ''}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'x-skipper-api-key': K,
        'x-boater-auth': auth_user_id,
      },
    })
    return NextResponse.json(await res.json().catch(() => ({ messages: [] })), { status: res.status })
  } catch (err) {
    return NextResponse.json({ messages: [], error: String(err) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const { auth_user_id, body, marina_id } = await req.json()
  if (!auth_user_id || !body) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  try {
    const res = await fetch(`${E}/api/v1/boater/messages`, {
      cache: 'no-store',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-skipper-api-key': K,
        'x-boater-auth': auth_user_id,
      },
      body: JSON.stringify(marina_id ? { body, marina_id } : { body }),
    })
    return NextResponse.json(await res.json().catch(() => ({ error: `engine ${res.status}` })), { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: 'Could not reach the marina server: ' + String(err) }, { status: 502 })
  }
}
