/**
 * GET /api/marinas/[id]/available-hot-moorings — thin Railway proxy (Rule 2).
 * Returns transient moorings that fit the requested dates + vessel dimensions.
 * Mooring hard stops are DELIBERATELY narrower than slips: weight, LOA, air draft,
 * and draft only — no beam check (boat swings freely on a mooring ball).
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await fetch(`${E}/api/v1/marina/${params.id}/available-hot-moorings${qs ? '?' + qs : ''}`, { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
