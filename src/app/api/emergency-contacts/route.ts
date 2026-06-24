/**
 * GET  /api/emergency-contacts?contact_id=<uuid>
 * POST /api/emergency-contacts  { contact_id, marina_id, name, phone, relationship, notes }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const contact_id = new URL(req.url).searchParams.get('contact_id')
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_emergency_contacts')
    .select('id, name, phone, relationship, notes, sort_order')
    .eq('contact_id', contact_id)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contact_id, marina_id, name, phone, relationship, notes, sort_order } = body

  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_emergency_contacts')
    .insert({ contact_id, marina_id, name, phone, relationship, notes, sort_order: sort_order ?? 0 })
    .select('id, name, phone, relationship, notes, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
