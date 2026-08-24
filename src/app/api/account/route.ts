import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''

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
