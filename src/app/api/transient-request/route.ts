import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/transient-request
// Boater submits a transient slip request for a marina
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      marina_id, boater_id,
      contact_name, contact_email, contact_phone,
      vessel_name, vessel_type, loa_ft, beam_ft, draft_ft,
      shore_power, fuel_type,
      arrival_date, departure_date, nights,
      notes,
    } = body

    if (!marina_id)       return NextResponse.json({ error: 'marina_id required' }, { status: 400 })
    if (!contact_name)    return NextResponse.json({ error: 'contact_name required' }, { status: 400 })
    if (!arrival_date)    return NextResponse.json({ error: 'arrival_date required' }, { status: 400 })
    if (!contact_email && !contact_phone)
      return NextResponse.json({ error: 'email or phone required' }, { status: 400 })

    const now = new Date().toISOString()
    const data: Record<string, unknown> = {
      marina_id, status: 'pending',
      contact_name, contact_email: contact_email || null, contact_phone: contact_phone || null,
      vessel_name: vessel_name || null, vessel_type: vessel_type || null,
      loa_ft: loa_ft || null, beam_ft: beam_ft || null, draft_ft: draft_ft || null,
      shore_power: shore_power ?? null, fuel_type: fuel_type || null,
      arrival_date, departure_date: departure_date || null,
      nights: nights || null, notes: notes || null,
      source: 'skipper_app',
      created_at: now, updated_at: now,
    }
    if (boater_id) data.boater_id = boater_id

    const { data: inserted, error } = await supabaseAdmin
      .from('transient_requests')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('[transient-request POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Broadcast to Helm via Supabase Realtime channel
    try {
      await supabaseAdmin
        .channel(`marina:${marina_id}`)
        .send({ type: 'broadcast', event: 'change', payload: { table: 'transient_requests', type: 'INSERT', record: inserted } })
    } catch { /* non-fatal */ }

    return NextResponse.json({ request: inserted })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[transient-request POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
