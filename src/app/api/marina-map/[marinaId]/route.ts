import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
// PUBLIC on purpose (Mike 2026-10-31): anyone may see a marina's slip / mooring layout. The engine only returns
// layout + labels (no vessel or owner names, no occupied/vacant status).
export async function GET(_req: NextRequest, { params }: { params: { marinaId: string } }) {
  const id = String(params.marinaId || '').replace(/[^0-9a-fA-F-]/g, '')
  if (id.length < 30) return NextResponse.json({ maps: [] }, { status: 400 })
  const res = await fetch(`${E}/api/v1/public/marina/${id}/map`, {
    headers: { 'Content-Type': 'application/json', 'x-skipper-api-key': K },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({ maps: [] }))
  return NextResponse.json(body, { status: res.status, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } })
}
