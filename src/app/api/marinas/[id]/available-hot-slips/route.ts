/**
 * GET /api/marinas/[id]/available-hot-slips — thin Railway proxy (Rule 2).
 * Returns transient slips that fit the requested dates + vessel dimensions
 * (LOA, beam, draft, air draft hard-stops all enforced server-side).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${E}/api/v1/marina/${params.id}/available-hot-slips${qs ? '?' + qs : ''}`, { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
