/**
 * GET  /api/asset-service-history?asset_id=<uuid>
 * POST /api/asset-service-history
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const asset_id = new URL(req.url).searchParams.get('asset_id')
  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_maintenance_log')
    .select('id, service_date, service_type, component, description, performed_by, cost, next_service_due, recorded_by')
    .eq('asset_id', asset_id)
    .is('deleted_at', null)
    .order('service_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { asset_id, marina_id, service_date, service_type, component, description, performed_by, cost, next_service_due } = body

  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_maintenance_log')
    .insert({ asset_id, marina_id, service_date, service_type, component, description, performed_by, cost: cost || null, next_service_due: next_service_due || null })
    .select('id, service_date, service_type, component, description, performed_by, cost, next_service_due')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
