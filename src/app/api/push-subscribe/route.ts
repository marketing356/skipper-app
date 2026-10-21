import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Store boater push subscription directly in Supabase
// App sends: { tenant_id (auth_user_id), endpoint, p256dh, auth }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, endpoint, p256dh, auth } = body
    if (!tenant_id || !endpoint) {
      return NextResponse.json({ error: 'tenant_id and endpoint required' }, { status: 400 })
    }
    // Look up contact_id from auth_user_id
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('auth_user_id', tenant_id)
      .is('marina_id', null)
      .maybeSingle()
    const contactId = contact?.id ?? null
    // Upsert by endpoint (one subscription per device)
    await supabaseAdmin.from('push_subscriptions').upsert({
      contact_id: contactId,
      endpoint,
      p256dh: p256dh ?? '',
      auth_key: auth ?? '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[push-subscribe]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
