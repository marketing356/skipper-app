import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/register
 * Creates or retrieves a national-pool contacts row (marina_id IS NULL) for a boater.
 * Uses supabaseAdmin to bypass RLS — boaters have no Supabase Auth session at signup time.
 * Returns: { authUserId, isNew }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const clean = email.trim().toLowerCase()

    // Check for existing national-pool contact
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id, auth_user_id')
      .eq('email', clean)
      .is('marina_id', null)
      .order('created_at', { ascending: true })
      .limit(1)

    const contact = existing?.[0] ?? null

    if (contact?.auth_user_id) {
      // Already registered
      return NextResponse.json({ authUserId: contact.auth_user_id, isNew: false })
    }

    if (contact && !contact.auth_user_id) {
      // Marina-added contact with no auth — link a new UUID
      const newId = crypto.randomUUID()
      await supabaseAdmin
        .from('contacts')
        .update({ auth_user_id: newId })
        .eq('id', contact.id)
      return NextResponse.json({ authUserId: newId, isNew: false })
    }

    // Brand-new boater — create national-pool row
    const newId = crypto.randomUUID()
    const { error } = await supabaseAdmin
      .from('contacts')
      .insert({ auth_user_id: newId, email: clean })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ authUserId: newId, isNew: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
