import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/link-contact
 *
 * Called immediately after Supabase Auth OTP verification succeeds.
 * Links the boater's real Supabase Auth UUID to their national-pool contacts row.
 *
 * Logic:
 *   1. Find national-pool contacts row (marina_id IS NULL) for this email
 *   2. If found: UPDATE auth_user_id = userId  (real Supabase Auth UUID)
 *   3. If not found: INSERT new row with auth_user_id + email
 *   4. Auto-couple: UPDATE any marina-scoped contacts rows with matching email
 *      that have no auth_user_id yet (silent coupling on first login)
 *
 * Uses supabaseAdmin to bypass RLS - this is the one-time identity bridge.
 * Body: { email: string, userId: string }
 * Returns: { contact }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const clean = email.trim().toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any

    // 1. Find existing national-pool contacts row
    const { data: existing } = await admin
      .from('contacts')
      .select('*')
      .eq('email', clean)
      .is('marina_id', null)
      .order('created_at', { ascending: true })
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contact: any = existing?.[0] ?? null

    if (contact) {
      // 2. Update auth_user_id to real Supabase Auth UUID
      const { data: updated, error } = await admin
        .from('contacts')
        .update({ auth_user_id: userId })
        .eq('id', contact.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      contact = updated
    } else {
      // 3. Brand-new boater - create national-pool row
      const { data: inserted, error } = await admin
        .from('contacts')
        .insert({ auth_user_id: userId, email: clean })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      contact = inserted
    }

    // 4. Auto-couple: link any marina-scoped contacts rows with this email.
    // Covers boaters pre-loaded by marina staff before they signed up.
    // Silent coupling - no user action required.
    const { data: pendingLinks } = await admin
      .from('contacts')
      .select('id')
      .eq('email', clean)
      .not('marina_id', 'is', null)
      .is('auth_user_id', null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const links = pendingLinks as any[] | null
    if (links && links.length > 0) {
      await admin
        .from('contacts')
        .update({ auth_user_id: userId })
        .in('id', links.map((c: { id: string }) => c.id))

      console.log(`[link-contact] Auto-coupled ${links.length} marina row(s) for ${clean}`)
    }

    return NextResponse.json({ contact })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
