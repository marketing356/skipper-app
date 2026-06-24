/**
 * GET  /api/asset-ship-log?asset_id=<uuid>
 * POST /api/asset-ship-log
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const asset_id = new URL(req.url).searchParams.get('asset_id')
  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_ship_logs')
    .select('id, log_date, notes, raw_voice_transcript, departed_from, arrived_at, distance_nm, engine_hours_start, engine_hours_end, fuel_used_gallons, crew_count, weather, source')
    .eq('asset_id', asset_id)
    .is('deleted_at', null)
    .order('log_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { asset_id, marina_id, log_date, notes, departed_from, arrived_at, distance_nm, engine_hours_start, engine_hours_end, fuel_used_gallons, crew_count, weather, source } = body

  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_ship_logs')
    .insert({
      asset_id,
      marina_id,
      log_date: log_date || new Date().toISOString(),
      notes,
      departed_from: departed_from || null,
      arrived_at: arrived_at || null,
      distance_nm: distance_nm || null,
      engine_hours_start: engine_hours_start || null,
      engine_hours_end: engine_hours_end || null,
      fuel_used_gallons: fuel_used_gallons || null,
      crew_count: crew_count || null,
      weather: weather || null,
      source: source || 'manual',
    })
    .select('id, log_date, notes, departed_from, arrived_at, distance_nm, engine_hours_start, engine_hours_end, fuel_used_gallons, crew_count, weather, source')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
