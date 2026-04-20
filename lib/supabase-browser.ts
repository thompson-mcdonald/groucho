import { createBrowserClient } from "@supabase/ssr"

/** Browser Supabase client for invitee auth (OTP / magic link flows). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
