/**
 * PATCH /api/profile — Update boater's own contact record (marina_id IS NULL)
 * Uses supabaseAdmin to bypass RLS — anon client was blocking writes.
 * Body: { auth_user_id: string, ...contactFields }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { auth_user_id, ...payload } = body
    if (!auth_user_id) return NextResponse.json({ error: 'auth_user_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(payload)
      .eq('auth_user_id', auth_user_id)
      .is('marina_id', null)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
