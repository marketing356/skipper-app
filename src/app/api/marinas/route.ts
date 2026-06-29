export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function geocode(marina: { id: string; name: string; city: string; state: string; zip?: string; address?: string }): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = [marina.address, marina.city, marina.state, marina.zip].filter(Boolean).join(', ')
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'AyeAyeSkipper/1.0 (admin@ayeayeskipper.com)' } })
    const json = await res.json()
    if (json && json[0]) {
      const lat = parseFloat(json[0].lat)
      const lng = parseFloat(json[0].lon)
      // Save back to DB so we don't geocode again
      await supabaseAdmin.from('marinas').update({ lat, lng }).eq('id', marina.id)
      return { lat, lng }
    }
  } catch { /* non-fatal */ }
  return null
}

// GET /api/marinas?q=abc
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || ''

  let query = supabaseAdmin
    .from('marinas')
    .select('id, name, city, state, zip, address, total_slips, transient_available, lat, lng')
    .order('name', { ascending: true })

  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[marinas]', error.message)
    return NextResponse.json({ marinas: [] })
  }

  // Geocode any marinas missing lat/lng
  const marinas = await Promise.all(
    (data ?? []).map(async (m: { id: string; name: string; city: string; state: string; zip?: string; address?: string; lat: number | null; lng: number | null; [key: string]: unknown }) => {
      if (m.lat && m.lng) return m
      const coords = await geocode(m)
      if (coords) return { ...m, lat: coords.lat, lng: coords.lng }
      return m
    })
  )

  return NextResponse.json({ marinas })
}
