import { createClient as _createClient } from '@supabase/supabase-js'

// Browser client — uses anon key, respects RLS
export const supabase = _createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Factory — used by useSkipperRealtime canonical hook (each channel needs its own client instance)
export function createClient() {
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
