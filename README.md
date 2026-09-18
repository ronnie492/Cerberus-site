# Team Cerebus

A proof-of-concept website: React + TypeScript on Vite, a Supabase back end,
and automatic deployment through Vercel.

**What it is meant to become:** a guild homepage for a Pokémon MMO, with a team
roster, an admin login for maintaining it, a "shiny showcase" for members' rare
catches, and possibly a Discord integration later. Today it is one page and a
connection health check. See [`docs/08-data-sources.md`](docs/08-data-sources.md)
for the external APIs those features will want and a sketch of the schema.

---

## If you are a coding agent picking this up

Read [`docs/07-agent-runbook.md`](docs/07-agent-runbook.md) first. It covers
provisioning the entire stack from the command line, the deploy pipeline, and
how to turn a non-technical owner's complaint into a diagnosis.

The short version. Three commands do almost everything:

```bash
npm run doctor     # diagnose the whole stack. Read-only. Run this first, always.
npm run deploy     # lint, build, migrate, deploy functions, push. In that order.
npm run deploy:db  # just the database migrations
```

`npm run doctor` checks the local toolchain, the env file, the live Supabase
API, whether the schema is applied, git state, every CLI login, and the CI
secrets, then prints a numbered list of what to fix. It distinguishes the
failures that look identical from outside: a paused database, a wrong key, a
missing migration, and an unpushed commit all read as "the site is broken" to
whoever is reporting it.

Provisioning from nothing, without touching a dashboard:

```bash
gh repo create cerebus-site --private --source=. --remote=origin --push
npx supabase projects create cerebus --org-id <ORG> --region us-east-1 --db-password '<PW>'
vercel link --yes && vercel git connect
# then env vars, CI secrets, and npm run deploy -- see docs/07
```

Four things need a browser and belong to the owner: `gh auth login`,
`vercel login`, `npx supabase login`, and minting a Supabase access token.
Everything else is scriptable.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then paste your Supabase URL and key in
npm run dev
```

Open the address it prints, usually <http://localhost:5173>.

The homepage shows a status box reporting whether Supabase is configured,
reachable, and whether the schema has been applied. It is accurate, and it is
the fastest way to tell which setup step remains.

New to all of this? [`docs/00-start-here.md`](docs/00-start-here.md) is a
six-guide path that assumes no prior experience with any of these tools.

## Scripts

| Command                    | Does                                            |
| -------------------------- | ----------------------------------------------- |
| `npm run dev`              | Dev server with hot reload                      |
| `npm run build`            | Type-check, then build to `dist/`               |
| `npm run preview`          | Serve the built `dist/` locally                 |
| `npm run lint`             | Lint with oxlint                                |
| `npm run doctor`           | Diagnose every part of the stack                |
| `npm run deploy`           | Full-stack deploy, safely ordered               |
| `npm run deploy:db`        | Apply pending migrations                        |
| `npm run deploy:functions` | Deploy edge functions                           |
| `npm run deploy:web`       | Push, which triggers Vercel                     |
| `npm run deploy:web:cli`   | Deploy the front end via the Vercel CLI instead |
| `npm run db:status`        | Show pending migrations without applying them   |
| `npm run db:diff`          | Pull dashboard-made schema changes into a file  |

`npm run deploy` takes `--dry-run`, `--yes`, `--skip-db`, `--skip-functions`,
`--skip-web`, and `--allow-dirty`. Use `--yes` when running it unattended.

## Layout

```
src/
├── App.tsx                        the homepage
├── main.tsx                       React entry point
├── index.css                      all styles, light and dark
├── components/
│   ├── PokemonSprite.tsx          worked example: fetch a sprite from PokeAPI
│   └── SupabaseStatus.tsx         the connection health box
└── lib/
    ├── pokemon.ts                 PokeAPI access, typed down to what we use
    └── supabase.ts                Supabase client, null when unconfigured

scripts/
├── doctor.mjs                     stack diagnosis, read-only
└── deploy.mjs                     full-stack deploy orchestrator

supabase/
├── migrations/0001_init.sql       schema, applied by hand or by CLI
└── functions/hello-cerebus/       example Deno edge function

.github/workflows/deploy.yml       build on every push; database when configured
docs/                              setup guides 0-6, agent runbook 7, data sources 8
vercel.json                        build settings and the SPA rewrite
.env.example                       template for .env.local
```

## Environment variables

Two, both required, both public by design:

| Variable                  | Value                                          |
| ------------------------- | ---------------------------------------------- |
| `VITE_SUPABASE_URL`       | `https://<project-ref>.supabase.co`            |
| `VITE_SUPABASE_ANON_KEY`  | The Supabase publishable (anon) key            |

Anything prefixed `VITE_` is compiled into the browser bundle and is readable
by anyone. The Supabase publishable key is intended for that. A service-role or
secret key must never be given a `VITE_` prefix.

They live in `.env.local` locally, which is git-ignored, and in the Vercel
project's Environment Variables for the deployed site. Changing them on Vercel
requires a redeploy to take effect.

## Deploying

Two halves, deployed by two different systems. That split explains most of the
confusion this stack produces, so it is worth holding onto.

**Front end.** Push to `main`. Vercel's Git integration rebuilds and publishes,
with no secrets involved. Set up in
[`docs/03-vercel-setup.md`](docs/03-vercel-setup.md).

**Database and edge functions.** Either `.github/workflows/deploy.yml`, which
runs on push once the three `SUPABASE_*` repository secrets exist, or
`npm run deploy` from a machine. The workflow skips the database half with a
notice when the secrets are absent, so it is harmless before it is configured.
See [`docs/06-deploying-supabase.md`](docs/06-deploying-supabase.md).

Both paths run migrations before the front end goes out, so the site never
ships against a database missing a table it expects.

## External data

The Pokémon-specific sources this site will use, with URLs checked and slug
traps marked, are in [`docs/08-data-sources.md`](docs/08-data-sources.md):
PokeAPI for species data, PokeSprite for regular and shiny icons, and notes on
caching, naming mismatches, and licensing.

## Status

Proof of concept, handed over as-is with no support. Known gaps: no custom
domain, no tests, no authentication, no error tracking, and one example table
with public read access. None of the guild features exist yet.
[`docs/00-start-here.md`](docs/00-start-here.md) lists this in full.
