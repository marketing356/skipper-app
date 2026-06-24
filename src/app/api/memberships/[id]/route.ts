/**
 * PATCH  /api/memberships/[id]  { org_name, membership_number, expiry_date, notes }
 * DELETE /api/memberships/[id]  → soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { org_name, membership_number, expiry_date, notes } = body

  const { data, error } = await supabaseAdmin
    .from('contact_memberships')
    .update({ org_name, membership_number, expiry_date: expiry_date || null, notes, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, org_name, membership_number, expiry_date, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('contact_memberships')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
