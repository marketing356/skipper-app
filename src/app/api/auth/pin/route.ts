import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/pin
 * Saves pin_hash + setup_complete for a boater's national-pool contacts row.
 * Uses supabaseAdmin to bypass RLS — boaters have no Supabase Auth session.
 * Body: { authUserId, pinHash }
 */
export async function POST(req: NextRequest) {
  try {
    const { authUserId, pinHash } = await req.json()

    if (!authUserId || !pinHash) {
      return NextResponse.json({ error: 'authUserId and pinHash required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ pin_hash: pinHash, setup_complete: true })
      .eq('auth_user_id', authUserId)
      .is('marina_id', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
