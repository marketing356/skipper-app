/**
 * POST /api/auth/pin-session
 * Issues a fresh Supabase session using PIN alone — no OTP email sent.
 * Called when the app starts on a new device/browser but skipper_uid cookie exists.
 *
 * Flow:
 * 1. Client sends { userId, pinHash } (pinHash = SHA-256 of the PIN, same as contacts.pin_hash)
 * 2. Server validates pinHash against contacts.pin_hash for this userId
 * 3. Admin generates a magic link (no email sent — token returned to server only)
 * 4. Server exchanges token for a real session and returns { access_token, refresh_token }
 * 5. Client calls supabase.auth.setSession() — real session restored, no email needed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, pinHash } = await req.json()

    if (!userId || !pinHash) {
      return NextResponse.json({ error: 'userId and pinHash required' }, { status: 400 })
    }

    // 1. Validate PIN hash against DB
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

    // 2. Get user email via admin
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userErr || !user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 3. Generate magic link server-side (no email sent — token returned here only)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    })

    if (linkErr || !linkData?.properties?.email_otp) {
      console.error('generateLink error:', linkErr)
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    // 4. Exchange OTP for a real session (anon client, no email sent — purely server-to-server)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: sessionData, error: otpErr } = await anonClient.auth.verifyOtp({
      email: user.email,
      token: linkData.properties.email_otp,
      type: 'email',
    })

    if (otpErr || !sessionData?.session) {
      console.error('verifyOtp error:', otpErr)
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    return NextResponse.json({
      access_token:  sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user_id:       user.id,
    })

  } catch (err) {
    console.error('pin-session error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
