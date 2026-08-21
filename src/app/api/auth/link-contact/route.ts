import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/link-contact
 *
 * Called immediately after OTP verification. Handles two paths:
 *
 * PATH A — Pre-loaded boater (marina staff already entered their data in OPS):
 *   1. Find marina-scoped contact(s) for this email
 *   2. Set auth_user_id + setup_complete = true on all of them
 *   3. Create/update national-pool contact, sync name+phone from marina contact
 *      and set setup_complete = true (skips onboarding form entirely)
 *   4. Return { contact, preLoaded: true }
 *
 * PATH B — Brand-new boater (not in any marina system yet):
 *   1. No marina-scoped contact found
 *   2. Create/update national-pool contact with auth_user_id, setup_complete = false
 *   3. Return { contact, preLoaded: false } → onboarding form shows (first name, last name, phone only)
 *
 * This architecture scales to any number of marinas and slip holders.
 * National-pool contact is the auth + PIN store. Marina-scoped contacts hold slip/vessel data.
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

    // ── Step 1: Find all marina-scoped contacts for this email ──────────────
    const { data: marinaScopedRows } = await admin
      .from('contacts')
      .select('*')
      .eq('email', clean)
      .not('marina_id', 'is', null)
      .is('deleted_at', null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marinaContacts: any[] = marinaScopedRows ?? []
    const preLoaded = marinaContacts.length > 0

    // ── Step 2: Link auth_user_id + mark setup_complete on marina contacts ──
    if (preLoaded) {
      await admin
        .from('contacts')
        .update({ auth_user_id: userId, setup_complete: true })
        .in('id', marinaContacts.map((c: { id: string }) => c.id))
    }

    // ── Step 3: Build sync payload from best marina contact ─────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bestMarina: any = marinaContacts.find(c => c.first_name) ?? marinaContacts[0] ?? null
    const syncPatch: Record<string, unknown> = {
      auth_user_id:    userId,
      setup_complete:  preLoaded,  // true = skip onboarding form, false = show it
    }
    if (bestMarina?.first_name) syncPatch.first_name = bestMarina.first_name
    if (bestMarina?.last_name)  syncPatch.last_name  = bestMarina.last_name
    if (bestMarina?.phone || bestMarina?.mobile) {
      syncPatch.phone = bestMarina.phone ?? bestMarina.mobile
    }

    // ── Step 4: Find or create national-pool contact (auth + PIN store) ─────
    const { data: existingPool } = await admin
      .from('contacts')
      .select('*')
      .eq('email', clean)
      .is('marina_id', null)
      .order('created_at', { ascending: true })
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contact: any = existingPool?.[0] ?? null

    if (contact) {
      const { data: updated, error } = await admin
        .from('contacts')
        .update(syncPatch)
        .eq('id', contact.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      contact = updated
    } else {
      const { data: inserted, error } = await admin
        .from('contacts')
        .insert({ email: clean, ...syncPatch })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      contact = inserted
    }

    return NextResponse.json({
      contact,
      preLoaded,
      setup_complete: contact?.setup_complete ?? false,
      pin_hash_exists: !!(contact?.pin_hash),
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
