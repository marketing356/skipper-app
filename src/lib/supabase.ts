import { createClient } from '@supabase/supabase-js'

let _admin: ReturnType<typeof createClient> | null = null

function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          // Next.js 14 caches fetch() by default — bypass it entirely for server-side DB reads
          fetch: (url: RequestInfo | URL, options?: RequestInit) =>
            fetch(url, { ...options, cache: 'no-store' }),
        },
      }
    )
  }
  return _admin
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) { return (getAdmin() as any)[prop] },
})
