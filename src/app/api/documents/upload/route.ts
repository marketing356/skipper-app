/**
 * POST /api/documents/upload
 * Accepts multipart form data, uploads file to Supabase Storage,
 * inserts a row into public.documents, returns { id, file_url }.
 *
 * FormData fields:
 *   file        — the file blob
 *   entity_type — 'contact' | 'asset'
 *   entity_id   — UUID
 *   marina_id   — UUID (optional)
 *   doc_type    — string
 *   doc_label   — string (used when doc_type = 'other')
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'vessel-documents'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const entityType = (form.get('entity_type') as string | null) ?? ''
    const entityId   = (form.get('entity_id')   as string | null) ?? ''
    const marinaId   = (form.get('marina_id')   as string | null) ?? null
    const docType    = (form.get('doc_type')    as string | null) ?? 'other'
    const docLabel   = (form.get('doc_label')   as string | null) ?? null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 })
    }

    // Sanitise filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${entityType}s/${entityId}/${Date.now()}_${safeName}`

    // Upload to Supabase Storage
    const { error: storageErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (storageErr) {
      console.error('[documents/upload] storage error:', storageErr)
      return NextResponse.json({ error: storageErr.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
    const fileUrl = urlData.publicUrl

    // Insert row in documents table
    const { data: doc, error: dbErr } = await supabaseAdmin
      .from('documents')
      .insert({
        entity_type: entityType,
        entity_id:   entityId,
        marina_id:   marinaId,
        doc_type:    docType,
        doc_label:   docLabel,
        file_name:   file.name,
        filename:    file.name,  // legacy column
        file_url:    fileUrl,
        file_size:   file.size,
        uploaded_by: 'ops',
        updated_at:  new Date().toISOString(),
      })
      .select('id, file_url')
      .single()

    if (dbErr) {
      console.error('[documents/upload] db error:', dbErr)
      // Clean up storage on DB failure
      await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ id: doc.id, file_url: doc.file_url })
  } catch (err) {
    console.error('[documents/upload] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
