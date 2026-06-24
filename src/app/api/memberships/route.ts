/**
 * GET  /api/memberships?contact_id=<uuid>
 * POST /api/memberships  { contact_id, marina_id, org_name, membership_number, expiry_date, notes }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const contact_id = new URL(req.url).searchParams.get('contact_id')
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_memberships')
    .select('id, org_name, membership_number, expiry_date, notes')
    .eq('contact_id', contact_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contact_id, marina_id, org_name, membership_number, expiry_date, notes } = body

  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contact_memberships')
    .insert({ contact_id, marina_id, org_name, membership_number, expiry_date: expiry_date || null, notes })
    .select('id, org_name, membership_number, expiry_date, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
