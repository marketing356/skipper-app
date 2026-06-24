/**
 * POST /api/auth/check-pin
 * Checks whether a boater email already has a PIN set in the DB.
 * Called from the auth screen BEFORE sending an OTP.
 *
 * Flow:
 * 1. Client sends { email }
 * 2. Server looks up contacts (marina_id IS NULL) for this email
 * 3. If pin_hash exists → returns { hasPIN: true, userId }
 * 4. If not → returns { hasPIN: false, userId: null }
 *
 * This is what enables email → PIN pad (no OTP) for returning users on any device.
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

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('auth_user_id, pin_hash')
      .eq('email', clean)
      .not('pin_hash', 'is', null)
      .is('marina_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error || !data?.auth_user_id || !data?.pin_hash) {
      return NextResponse.json({ hasPIN: false, userId: null })
    }

    return NextResponse.json({ hasPIN: true, userId: data.auth_user_id })
  } catch (err) {
    console.error('check-pin error:', err)
    return NextResponse.json({ hasPIN: false, userId: null })
  }
}
