import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Store boater web-push subscription.
// App sends: { tenant_id (auth_user_id), endpoint, p256dh, auth, marina_id? }
// FIX 2026-10-30 (messaging leak L8): the Helm sends reply notifications to push_subscriptions
// rows whose contact_id = the boater's MARINA contact (the thread tenant). This used to save the
// national-pool contact id, so no web-app user was ever notified of a marina reply.
// Now: contact at the given marina_id, else the marina contact with an active/reserved lease,
// else the oldest live marina contact, else the national-pool contact.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, endpoint, p256dh, auth, marina_id } = body
    if (!tenant_id || !endpoint) {
      return NextResponse.json({ error: 'tenant_id and endpoint required' }, { status: 400 })
    }
    const { data: rows } = await supabaseAdmin
      .from('contacts')
      .select('id, marina_id, email, created_at')
      .eq('auth_user_id', tenant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    const contacts = (rows ?? []) as { id: string; marina_id: string | null; email: string | null }[]
    const marinaContacts = contacts.filter(c => c.marina_id)
    let chosen = marina_id ? marinaContacts.find(c => c.marina_id === marina_id) : undefined
    if (!chosen && marinaContacts.length > 1) {
      const { data: leases } = await supabaseAdmin
        .from('leases')
        .select('tenant_id')
        .in('tenant_id', marinaContacts.map(c => c.id))
        .in('status', ['active', 'reserved'])
        .is('deleted_at', null)
      const holders = new Set((leases ?? []).map((l: { tenant_id: string }) => l.tenant_id))
      chosen = marinaContacts.find(c => holders.has(c.id))
    }
    if (!chosen) chosen = marinaContacts[0] ?? contacts.find(c => !c.marina_id)
    // Upsert by endpoint (one subscription per device)
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
      contact_id: chosen?.id ?? null,
      marina_id: chosen?.marina_id ?? null,
      user_email: chosen?.email ?? null,
      endpoint,
      p256dh: p256dh ?? '',
      auth_key: auth ?? '',
      user_agent: req.headers.get('user-agent') ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (error) {
      console.error('[push-subscribe] save failed', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, contact_id: chosen?.id ?? null, marina_id: chosen?.marina_id ?? null })
  } catch (e: unknown) {
    console.error('[push-subscribe]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
