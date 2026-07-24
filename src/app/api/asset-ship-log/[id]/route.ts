import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${E}/api/v1/boater/ship-log/${params.id}`, { method: 'PATCH', headers: H(), body: JSON.stringify(await req.json()) })
  return NextResponse.json(await res.json(), { status: res.status })
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${E}/api/v1/boater/ship-log/${params.id}`, { method: 'DELETE', headers: H() })
  return NextResponse.json(await res.json(), { status: res.status })
}
