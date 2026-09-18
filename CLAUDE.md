# Team Cerebus site

Guild homepage for a Pokémon MMO. React 19 + TypeScript, built by Vite,
deployed by Vercel on push to `main`, with Supabase as the back end.

Currently a proof of concept: one page plus a connection health check. The
intended features are a team roster, an admin login for maintaining it, a
shiny showcase for members' rare catches, and possibly a Discord integration.
None of those are built. `docs/08-data-sources.md` has the external APIs they
need and a sketch of the schema.

Handed over as-is. The guides in `docs/` are the setup path for a
non-technical owner; keep them accurate if you change how any of this works.

## Who you are working for

The owner is not technical. They will not open a dashboard or read a build log.
They report symptoms in their own words and expect a fix. `docs/07-agent-runbook.md`
is the operating guide: provisioning over the CLI, the deploy pipeline, and a
table translating complaints into commands. Read it before operating anything.

Two habits it asks for, worth repeating here. Report the actual `npm run doctor`
output rather than a conclusion, because they have no way to check your work.
And translate: a stack trace or a `PGRST205` means nothing to them.

## Commands

- `npm run doctor` diagnose the whole stack. Read-only, always safe. Run it
  first whenever anything is reported broken, before forming a theory.
- `npm run deploy` full-stack deploy: lint, build, migrations, functions, push.
  Add `--yes` when running unattended, `--dry-run` to see the plan.
- `npm run dev` dev server
- `npm run build` type-check (`tsc -b`) then build; this is what Vercel runs
- `npm run db:status` pending migrations, applying none

Run `npm run build` before declaring front-end work finished. It type-checks,
so it catches what the dev server does not.

## Conventions

- `src/lib/supabase.ts` exports a client that is `null` when the env vars are
  absent, so the site still builds and deploys before Supabase exists. Handle
  the null rather than asserting past it.
- Only `VITE_`-prefixed env vars reach the browser, and everything with that
  prefix is public. A secret or service-role key must never get one.
- New env vars go in three places: `.env.local`, `.env.example` with a
  placeholder, and the Vercel dashboard. A Vercel change needs a redeploy.
- Every new Supabase table enables Row Level Security and adds explicit
  policies. `supabase/migrations/0001_init.sql` is the pattern to copy. The
  shape these features want is public read, authenticated write.
- Migrations are append-only. Never edit an applied migration; add the next
  numbered file. Never force past schema drift, and never run `supabase db
  reset` against the linked project, which is production.
- `supabase/functions/` is Deno, not Node, and is deliberately outside the
  TypeScript project in `tsconfig.app.json`. Do not try to make it type-check
  with the rest of `src/`.
- Styling is plain CSS in `src/index.css`, with light and dark palettes as
  custom properties. No CSS framework; do not add one without being asked.
- For sprites, store `slug` and `dex_number` on your own rows and derive image
  URLs at render time rather than calling an API on the render path. Resolve
  slugs through PokeSprite's `data/pokemon.json`, not by lowercasing a name.

## Scope

Small and deliberately unfinished. No tests, no auth, no analytics, no router.
Before adding a dependency or a layer of structure, check that the task
actually calls for it.

Escalate rather than working around: anything needing a payment method, the
owner's login or 2FA, deleting data, or making the repository public.
