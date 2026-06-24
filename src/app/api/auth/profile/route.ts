import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * @deprecated 2026-06-24 — Replaced by direct Supabase client write in ContactSetupScreen.
 * After Supabase Auth OTP, boaters have real sessions and auth.uid() works client-side.
 * RLS policy boater_update_own_contact allows direct writes from the browser.
 * This route is kept as dead code for reference. It is no longer called.
 *
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
