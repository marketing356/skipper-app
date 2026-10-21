import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Store boater's web push subscription directly in Supabase (no Railway needed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, subscription } = body
    if (!tenant_id || !subscription?.endpoint) {
      return NextResponse.json({ error: 'tenant_id and subscription required' }, { status: 400 })
    }
    const { endpoint, keys } = subscription
    await supabaseAdmin.from('push_subscriptions').upsert({
      contact_id: tenant_id,
      endpoint,
      p256dh: keys?.p256dh ?? '',
      auth_key: keys?.auth ?? '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'contact_id' })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[push-subscribe]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
