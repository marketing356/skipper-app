/**
 * POST /api/invoices/[id]/pay — Create Stripe Checkout session for a boater invoice
 * Rule 2 compliant — proxies to Railway. No Supabase. No direct Stripe calls from client.
 * Railway verifies invoice ownership, creates Stripe session, returns checkout_url.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { auth_user_id } = await req.json()
    if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })
    if (!params.id)    return NextResponse.json({ error: 'invoice id required' },  { status: 400 })

    const res = await fetch(`${E}/api/v1/boater/invoices/${params.id}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-skipper-api-key': K,
        'x-boater-auth':     auth_user_id,
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
