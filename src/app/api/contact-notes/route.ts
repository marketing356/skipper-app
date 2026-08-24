import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })
export async function GET(req: NextRequest) {
  const qs = new URL(req.url).searchParams.toString()
  const res = await fetch(`${E}/api/v1/boater/contact-notes${qs ? '?' + qs : ''}`, {
    cache: 'no-store', headers: H() })
  return NextResponse.json(await res.json(), { status: res.status })
}
export async function POST(req: NextRequest) {
  const res = await fetch(`${E}/api/v1/boater/contact-notes`, {
    cache: 'no-store', method: 'POST', headers: H(), body: JSON.stringify(await req.json()) })
  return NextResponse.json(await res.json(), { status: res.status })
}
