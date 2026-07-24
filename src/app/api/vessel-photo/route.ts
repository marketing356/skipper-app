/**
 * POST /api/vessel-photo — Upload vessel photo to Supabase Storage
 * Returns { url } — caller sets photo_url on the asset form.
 * FormData: { file, asset_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'vessel-photos'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const assetId = form.get('asset_id') as string | null

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Invalid file type — use JPEG, PNG, WEBP, GIF, or HEIC' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large — max 10 MB' }, { status: 400 })

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${assetId ?? 'unknown'}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
