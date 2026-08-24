/**
 * POST /api/auth/check-pin
 * Checks whether a boater email already has a PIN set in the DB.
 *
 * Flow:
 * 1. Client sends { email }
 * 2. Server looks up contacts for this email that have a pin_hash set.
 *    Prefers marina_id=NULL (pure boater row) but accepts any row with a PIN —
 *    a login is a login regardless of which surface the contact was created from.
 * 3. If pin_hash exists → returns { hasPIN: true, userId }
 * 4. If not → returns { hasPIN: false, userId: null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ hasPIN: false, userId: null })
    }

    const clean = email.trim().toLowerCase()

    // Fetch all rows for this email that have a PIN set.
    // Prefer marina_id=NULL (boater row) but fall back to any row with a PIN
    // so that contacts created via the marina side still work as a login.
    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('auth_user_id, pin_hash, marina_id')
      .eq('email', clean)
      .not('pin_hash', 'is', null)
      .not('auth_user_id', 'is', null)
      .order('marina_id', { ascending: true, nullsFirst: true })
      .limit(5)

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ hasPIN: false, userId: null })
    }

    // Pick the boater (marina_id=null) row first; fall back to first match
    const best = rows.find(r => r.marina_id === null) ?? rows[0]

    if (!best?.auth_user_id || !best?.pin_hash) {
      return NextResponse.json({ hasPIN: false, userId: null })
    }

    return NextResponse.json({ hasPIN: true, userId: best.auth_user_id })
  } catch (err) {
    console.error('check-pin error:', err)
    return NextResponse.json({ hasPIN: false, userId: null })
  }
}
