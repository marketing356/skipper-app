import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const asset_id = new URL(req.url).searchParams.get('asset_id')
  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_notes_log')
    .select('id, note_date, note')
    .eq('asset_id', asset_id)
    .is('deleted_at', null)
    .order('note_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { asset_id, marina_id, note_date, note } = body
  if (!asset_id || !note) return NextResponse.json({ error: 'asset_id and note required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('vessel_notes_log')
    .insert({ asset_id, marina_id: marina_id || null, note_date: note_date || new Date().toISOString(), note })
    .select('id, note_date, note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
