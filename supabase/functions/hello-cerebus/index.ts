/**
 * Example Supabase Edge Function.
 *
 * Edge functions run on Deno inside Supabase, not in the React app and not on
 * Vercel. That is why this file imports from a URL and uses `Deno.env` -- it
 * is a different runtime from the rest of this repo, and the TypeScript setup
 * in tsconfig.app.json deliberately ignores this folder.
 *
 * Deploy:  supabase functions deploy hello-cerebus
 * Call:    curl -H "Authorization: Bearer <ANON_KEY>" \
 *            https://<project-ref>.supabase.co/functions/v1/hello-cerebus
 *
 * See docs/06-deploying-supabase.md.
 */

// @ts-nocheck -- Deno runtime, not type-checked by this repo's tsconfig.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  // These two are injected automatically by Supabase at runtime; you do not
  // set them yourself. SERVICE_ROLE_KEY bypasses Row Level Security, which is
  // safe here only because this code runs on Supabase's servers, never in a
  // browser.
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { count, error } = await client
    .from('messages')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ greeting: 'Hello from Team Cerebus.', messages: count }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  )
})
