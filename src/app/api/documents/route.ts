/**
 * GET /api/documents?entity_type=contact&entity_id=<uuid>
 * Returns all non-deleted documents for a given entity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entity_type')
  const entityId   = searchParams.get('entity_id')

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, doc_type, doc_label, file_name, filename, file_url, file_size, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
