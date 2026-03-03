import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a proxy that does nothing during build/SSR
    return new Proxy({} as SupabaseClient, {
      get: () => () => ({ data: null, error: null }),
    })
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = getClient()
