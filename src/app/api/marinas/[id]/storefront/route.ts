/**
 * §37 Thin Proxy — Marina storefront (public profile page for boater Marinas tab)
 * All logic lives in Railway (skipper-engine). This file is a pass-through only.
 */
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${E}/api/v1/marina/${params.id}/storefront`, { headers: H(), cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
