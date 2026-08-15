/**
 * POST /api/auth/pin-refresh
 * Verifies a boater's CURRENT PIN before allowing a PIN change.
 * Called from the Account screen's "Change PIN" flow (verifyCurrentPin).
 *
 * Flow:
 * 1. Client sends { userId, pin } (raw 4-digit PIN)
 * 2. Server hashes the PIN with SHA-256 (same scheme as PinSetupScreen / check-pin)
 * 3. Compares against contacts.pin_hash for this userId (national-pool row, marina_id IS NULL)
 * 4. Returns 200 { ok: true } on match, 401 otherwise
 *
 * Matches the existing PIN pattern (check-pin, pin-session): direct supabaseAdmin read,
 * marina_id IS NULL national-pool row, oldest-first limit 1.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, pin } = await req.json()

    if (!userId || !pin) {
      return NextResponse.json({ error: 'userId and pin required' }, { status: 400 })
    }

    const pinHash = createHash('sha256').update(String(pin)).digest('hex')

    const { data: rows, error: dbErr } = await supabaseAdmin
      .from('contacts')
      .select('pin_hash')
      .eq('auth_user_id', userId)
      .is('marina_id', null)
      .order('created_at', { ascending: true })
      .limit(1)

    if (dbErr || !rows || rows.length === 0 || !rows[0].pin_hash) {
      return NextResponse.json({ error: 'PIN not set up' }, { status: 404 })
    }

    if (rows[0].pin_hash !== pinHash) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('pin-refresh error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
