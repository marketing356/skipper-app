/**
 * GET  /api/contact-notes?contact_id=<uuid>
 * POST /api/contact-notes  { contact_id, note_date, note }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const contact_id = new URL(req.url).searchParams.get('contact_id')
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_notes')
    .select('id, note_date, note')
    .eq('contact_id', contact_id)
    .is('deleted_at', null)
    .order('note_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contact_id, note_date, note } = body
  if (!contact_id || !note) return NextResponse.json({ error: 'contact_id and note required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_notes')
    .insert({
      contact_id,
      note_date: note_date || new Date().toISOString().slice(0, 10),
      note,
    })
    .select('id, note_date, note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
