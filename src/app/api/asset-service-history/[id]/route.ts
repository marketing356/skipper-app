import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { service_date, service_type, component, description, performed_by, cost, next_service_due } = body

  const { data, error } = await supabaseAdmin
    .from('vessel_maintenance_log')
    .update({ service_date, service_type, component, description, performed_by, cost: cost || null, next_service_due: next_service_due || null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, service_date, service_type, component, description, performed_by, cost, next_service_due')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('vessel_maintenance_log')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
