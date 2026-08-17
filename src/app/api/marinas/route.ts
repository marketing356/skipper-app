import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auth_user_id = searchParams.get('auth_user_id') || ''
  const fwd = new URLSearchParams(searchParams)
  fwd.delete('auth_user_id')
  const qs = fwd.toString()
  const res = await fetch(`${E}/api/v1/boater/marinas-list${qs ? '?' + qs : ''}`, {
    headers: { ...H(), ...(auth_user_id ? { 'x-boater-auth': auth_user_id } : {}) },
    cache: 'no-store',
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
