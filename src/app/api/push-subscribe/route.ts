import { NextRequest, NextResponse } from 'next/server'

const ENGINE = process.env.NEXT_PUBLIC_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const API_KEY = process.env.SKIPPER_API_KEY || ''

// Boater subscribes to push notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, subscription } = body
    if (!tenant_id || !subscription) {
      return NextResponse.json({ error: 'tenant_id and subscription required' }, { status: 400 })
    }
    // Forward to engine to store
    const r = await fetch(`${ENGINE}/api/v1/boater/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ tenant_id, subscription }),
    })
    const d = await r.json()
    return NextResponse.json(d, { status: r.ok ? 200 : 500 })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
