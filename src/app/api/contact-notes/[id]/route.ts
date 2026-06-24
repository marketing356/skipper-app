/**
 * PATCH  /api/contact-notes/[id]  { note_date, note }
 * DELETE /api/contact-notes/[id]  → soft delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { note_date, note } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('contact_notes')
    .update({ note_date, note, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, note_date, note')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('contact_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
