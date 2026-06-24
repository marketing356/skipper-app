/**
 * PATCH  /api/asset-engines/[id]
 * DELETE /api/asset-engines/[id]  → soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { engine_type, position, make, model, year, horsepower, serial_number, fuel_type, current_hours, notes } = body

  const { data, error } = await supabaseAdmin
    .from('vessel_engines')
    .update({ engine_type, position, make, model, year: year || null, horsepower: horsepower || null, serial_number, fuel_type, current_hours: current_hours || null, notes, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, engine_type, position, make, model, year, serial_number, fuel_type, horsepower, current_hours, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('vessel_engines')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
