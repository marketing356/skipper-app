/**
 * POST /api/asset-ship-log/auto-entry
 * Write an automatic log entry triggered by a Helm event (marina check-in,
 * work order completion, fuel sale, etc.). Called server-to-server with
 * service role — never exposed to boater clients.
 *
 * Body:
 *   asset_id     string  required — marina_assets.id (vessel)
 *   marina_id    string  optional
 *   source       string  required — 'helm_event' | 'fuel' | 'work_order' | 'skipper'
 *   notes        string  required — human-readable summary Skipper wrote
 *   log_date     string  optional — ISO date, defaults to now
 *   [any other vessel_ship_logs columns]
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCES = ['helm_event', 'fuel', 'work_order', 'skipper', 'marina_checkin', 'marina_checkout']

export async function POST(req: NextRequest) {
  // Verify service-level auth header
  const auth = req.headers.get('x-skipper-service-key')
  if (auth !== process.env.SKIPPER_SERVICE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { asset_id, marina_id, source, notes, log_date, ...rest } = body

  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })
  if (!notes)    return NextResponse.json({ error: 'notes required' },    { status: 400 })
  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json({ error: `source must be one of: ${ALLOWED_SOURCES.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('vessel_ship_logs')
    .insert({
      asset_id,
      marina_id:          marina_id ?? null,
      source,
      notes,
      log_date:           log_date ?? new Date().toISOString(),
      departed_from:      rest.departed_from      ?? null,
      arrived_at:         rest.arrived_at         ?? null,
      distance_nm:        rest.distance_nm        ?? null,
      engine_hours_start: rest.engine_hours_start ?? null,
      engine_hours_end:   rest.engine_hours_end   ?? null,
      fuel_used_gallons:  rest.fuel_used_gallons  ?? null,
      fuel_picked_up_gallons: rest.fuel_picked_up_gallons ?? null,
      crew_count:         rest.crew_count         ?? null,
      weather:            rest.weather            ?? null,
      sea_conditions:     rest.sea_conditions     ?? null,
    })
    .select('id, log_date, source, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
