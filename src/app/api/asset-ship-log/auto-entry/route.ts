/**
 * POST /api/asset-ship-log/auto-entry — Write ship log entry via Railway (Rule 2 compliant)
 * Server-to-server internal route. Auth: x-skipper-service-key header.
 */
import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const E = process.env.SKIPPER_ENGINE_URL || 'https://skipper-engine-production.up.railway.app'
const K = process.env.SKIPPER_DATA_API_KEY || ''
const H = () => ({ 'Content-Type': 'application/json', 'x-skipper-api-key': K })

const ALLOWED_SOURCES = ['helm_event', 'fuel', 'work_order', 'skipper', 'marina_checkin', 'marina_checkout']

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-skipper-service-key')
  if (auth !== process.env.SKIPPER_SERVICE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (!body.asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })
  if (!body.notes) return NextResponse.json({ error: 'notes required' }, { status: 400 })
  if (!ALLOWED_SOURCES.includes(body.source)) {
    return NextResponse.json({ error: `source must be one of: ${ALLOWED_SOURCES.join(', ')}` }, { status: 400 })
  }
  const res = await fetch(`${E}/api/v1/boater/ship-log`, {
    method: 'POST', headers: H(), body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
