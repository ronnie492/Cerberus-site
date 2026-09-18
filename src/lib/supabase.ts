import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client.
 *
 * Both values come from environment variables, which Vite inlines at build
 * time. Anything prefixed with `VITE_` is PUBLIC: it ends up in the JavaScript
 * bundle that browsers download. That is fine for these two values -- the
 * anon key is designed to be public and is only as powerful as your Row Level
 * Security policies allow. Never put a service-role key in a VITE_ variable.
 *
 * Locally these come from `.env.local`; on Vercel they come from the project's
 * Environment Variables settings. See docs/04-supabase-setup.md.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `null` when either env var is absent. Returning null instead of throwing
 * means the site still builds and deploys before Supabase exists, which is
 * the order the setup docs walk through -- the homepage just reports that it
 * is unconfigured.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
