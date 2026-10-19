import type { SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig } from "./config"

let client: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (client) return client
  const { url, key } = getSupabaseConfig()
  client = createBrowserClient(
    url,
    key,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  )
  return client
}
