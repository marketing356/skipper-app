import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/profile
 * Updates a boater's national-pool contacts row with onboarding profile fields.
 * Uses supabaseAdmin to bypass RLS — boaters have no Supabase Auth session.
 * Body: { authUserId, ...profileFields }
 * Returns: { contact }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authUserId, ...fields } = body

    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(fields)
      .eq('auth_user_id', authUserId)
      .is('marina_id', null)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    return NextResponse.json({ contact: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
