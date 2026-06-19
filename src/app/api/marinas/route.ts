export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/marinas?q=abc
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || ''

  let query = supabaseAdmin
    .from('marinas')
    .select('id, name, city, state, address, total_slips')
    .order('name', { ascending: true })

  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[marinas]', error.message)
    return NextResponse.json({ marinas: [] })
  }

  return NextResponse.json({ marinas: data ?? [] })
}
