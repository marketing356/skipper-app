import { NextRequest, NextResponse } from 'next/server'

// NO Basic Auth gate here — per Michael 2026-08-14: this app is already naturally
// gated by its own real login flow (email -> OTP -> PIN, see skipper-auth-doctrine-full.md).
// A random visitor can load the login screen but cannot do anything without a real
// account. Adding Basic Auth on top only breaks testing, it doesn't add real protection.
// Site-wide Basic Auth gates DO still apply to the marketing site, Helm, and Chart Room —
// those don't have their own login wall for anonymous visitors.
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
