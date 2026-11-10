import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
// Boater-app render errors land in the Vercel runtime logs (search for CLIENT_ERROR).
export async function POST(req: NextRequest) {
  try { const b = await req.json(); console.error('CLIENT_ERROR', JSON.stringify(b).slice(0, 4000)) } catch { /* ignore */ }
  return NextResponse.json({ ok: true })
}
