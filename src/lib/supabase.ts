import { createClient } from '@supabase/supabase-js'

let _admin: ReturnType<typeof createClient> | null = null

function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _admin
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) { return (getAdmin() as any)[prop] },
})
