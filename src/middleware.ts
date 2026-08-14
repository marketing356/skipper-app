import { NextRequest, NextResponse } from 'next/server'

// SITE-WIDE PASSWORD GATE — TEST PHASE ONLY.
// Locked 2026-08-14 per Michael: site is not ready for public traffic now that
// real SMS (Twilio) is live and costs real money per message. Simple shared
// username/password gate, same credentials pattern already used elsewhere in
// the Skipper universe (placeholder.ayeayeskipper.com: abcmarina/skipper2026).
// REMOVE this gate only when Michael explicitly says the site is ready to go public.
const GATE_USER = 'abcmarina'
const GATE_PASS = 'skipper2026'

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="AyeAyeSkipper — Test Phase"' },
  })
}

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || !auth.startsWith('Basic ')) return unauthorized()

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString()
  const [user, pass] = decoded.split(':')
  if (user !== GATE_USER || pass !== GATE_PASS) return unauthorized()

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|skipper-avatar.jpg).*)'],
}
