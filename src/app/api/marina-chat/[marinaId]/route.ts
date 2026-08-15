/**
 * GET  /api/marina-chat/[marinaId]?auth_user_id=...  — Skipper chat history for this
 *      boater at a specific marina, via Railway (Rule 2). Replaces direct Supabase reads.
 * POST /api/marina-chat/[marinaId]  { auth_user_id, direction, body, sender_name }
 *      — Persist one chat message (inbound boater msg or outbound Skipper reply).
 *      Replaces direct Supabase message inserts. No auto-reply — the app drives the
 *      AI reply via /chat and posts it back here as an outbound message.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function GET(req: NextRequest, { params }: { params: { marinaId: string } }) {
  try {
    const auth_user_id = new URL(req.url).searchParams.get('auth_user_id')
    if (!auth_user_id) return NextResponse.json({ messages: [] }, { status: 400 })
    const res = await fetch(`${E}/api/v1/boater/marina-chat/${params.marinaId}`, {
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ messages: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { marinaId: string } }) {
  try {
    const { auth_user_id, direction, body, sender_name } = await req.json()
    if (!auth_user_id || !direction || !body) {
      return NextResponse.json({ error: 'auth_user_id, direction, body required' }, { status: 400 })
    }
    const res = await fetch(`${E}/api/v1/boater/marina-chat/${params.marinaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K, 'x-boater-auth': auth_user_id },
      body: JSON.stringify({ direction, body, sender_name }),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
