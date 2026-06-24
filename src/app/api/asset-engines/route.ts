/**
 * GET  /api/asset-engines?asset_id=<uuid>
 * POST /api/asset-engines  { asset_id, marina_id, engine_number, engine_type, position, make, model, year, hp, serial_number, fuel_type, current_hours, notes }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const asset_id = new URL(req.url).searchParams.get('asset_id')
  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_engines')
    .select('id, engine_type, position, make, model, year, serial_number, fuel_type, horsepower, current_hours, status, sort_order, notes')
    .eq('asset_id', asset_id)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { asset_id, marina_id, engine_number, engine_type, position, make, model, year, horsepower, serial_number, fuel_type, current_hours, notes } = body

  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_engines')
    .insert({ asset_id, marina_id, engine_type, position, make, model, year: year || null, horsepower: horsepower || null, serial_number, fuel_type, current_hours: current_hours || null, notes, sort_order: engine_number ?? 1 })
    .select('id, engine_type, position, make, model, year, serial_number, fuel_type, horsepower, current_hours, status, sort_order, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
