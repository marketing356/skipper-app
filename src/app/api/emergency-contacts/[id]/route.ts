/**
 * PATCH  /api/emergency-contacts/[id]  { name, phone, relationship, notes }
 * DELETE /api/emergency-contacts/[id]  → soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, phone, relationship, notes } = body

  const { data, error } = await supabaseAdmin
    .from('contact_emergency_contacts')
    .update({ name, phone, relationship, notes, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, name, phone, relationship, notes, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('contact_emergency_contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
