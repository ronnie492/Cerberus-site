# 7. Agent runbook: provisioning and operating this stack from the CLI

**Audience:** the coding agent that ends up owning this site. A human can
follow it too, but guides 1 through 6 are the gentler route for that.

**The operating model this assumes.** The person who owns this site is not
technical. They will not open the Vercel dashboard, they will not read a build
log, and they will not know the difference between "the site is down" and "the
database is paused". They will describe a symptom to you, in their own words,
and expect it to be fixed. So you need two things: the ability to provision and
deploy the entire stack without a dashboard, and a way to turn a vague
complaint into a specific diagnosis. This guide is both.

---

## The three commands that matter

```
npm run doctor     diagnose. Read-only, always safe, run it first.
npm run deploy     full-stack deploy in the correct order.
npm run deploy:db  just the database migrations.
```

`npm run doctor` is the important one. It checks the local toolchain, the env
file, the live Supabase API, the schema, git state, every CLI login, and
whether the CI secrets exist, then prints a numbered list of next actions. When
the owner reports anything at all, run it before forming a theory. It
distinguishes the failures that look identical from the outside: a paused
database, a wrong key, a missing migration, and an unpushed commit all produce
"the site is broken" from a non-technical observer.

`npm run deploy` runs the steps in the order that cannot strand the site:
lint and type-check, then migrations, then edge functions, then the git push
that triggers Vercel. The front end therefore never goes live against a
database missing the table it expects. It refuses to run on a dirty working
tree or off `main`, shows a migration dry run before applying anything, and
takes `--dry-run`, `--yes`, `--skip-db`, `--skip-functions`, `--skip-web`, and
`--allow-dirty`. Use `--yes` when running unattended, because the interactive
confirmation on migrations will otherwise stop you.

The rest of the scripts:

| Command                     | Does                                          |
| --------------------------- | --------------------------------------------- |
| `npm run deploy:functions`  | Deploy all edge functions                     |
| `npm run deploy:web`        | `git push`, which triggers Vercel             |
| `npm run deploy:web:cli`    | `vercel --prod`, bypassing git entirely       |
| `npm run db:status`         | Which migrations are pending, applying none   |
| `npm run db:diff`           | Pull dashboard-made schema changes into a file |

---

## Provisioning the whole stack from the CLI

This is the from-nothing path. It creates the GitHub repo, the Supabase
project, and the Vercel project without opening a dashboard.

### What genuinely cannot be done headlessly

Four things need a browser, and the owner has to do them because they involve
their identity. Get all four out of the way first rather than discovering them
one at a time:

1. `gh auth login` (device code, one paste)
2. `vercel login` (email or SSO)
3. `npx supabase login` (browser authorization)
4. Minting a Supabase access token for CI, at
   <https://supabase.com/dashboard/account/tokens>. There is no CLI for this.
   Do not reuse the token that `supabase login` stored locally; mint a separate
   one named something like `github-actions`.

Everything below this line is scriptable.

### Step 1: the CLIs

```
npm install                       # includes the Supabase CLI as a dev dependency
npm i -g vercel                   # Vercel CLI
brew install gh                   # or winget install GitHub.cli
```

### Step 2: GitHub repository

```
git init
git add .
git commit -m "Initial commit: Team Cerebus proof of concept"
git branch -M main
gh repo create cerebus-site --private --source=. --remote=origin --push
```

That one `gh repo create` creates the repository, adds it as `origin`, and
pushes. Keep it private; Vercel builds private repos on the free plan.

### Step 3: Supabase project

```
npx supabase orgs list
```

Note the organization id, then:

```
npx supabase projects create cerebus \
  --org-id <ORG_ID> \
  --region us-east-1 \
  --db-password '<A_STRONG_GENERATED_PASSWORD>'
```

Generate that password rather than inventing one, and save it immediately: CI
needs it as a secret and you cannot read it back.

```
openssl rand -base64 24
```

Valid regions come from `npx supabase projects create --help`. Pick one near
the guild's players. The region is the one decision here that cannot be changed
later without recreating the project.

Provisioning takes a minute or two. Then collect the two values the site needs:

```
npx supabase projects list                                  # note the project ref
npx supabase projects api-keys --project-ref <REF>          # note the anon/publishable key
```

Both commands accept `-o json` if you would rather parse than read. Check the
shape with one call before writing a parser against it; it has changed between
CLI versions.

The URL is `https://<REF>.supabase.co`. Take the **publishable** or **anon**
key, never the secret or service-role one.

### Step 4: local env file, then link

```
cp .env.example .env.local
# edit .env.local: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npx supabase link --project-ref <REF>
```

`npm run doctor` will now confirm the keys work and tell you the schema is not
applied yet, which is correct at this point.

### Step 5: Vercel project

```
vercel link --yes        # creates or links the project
vercel git connect       # makes Vercel deploy on every push to main
```

Then the environment variables. `vercel env add` reads the value from stdin,
which is what makes this scriptable:

```
for TARGET in production preview development; do
  printf '%s' "https://<REF>.supabase.co" | vercel env add VITE_SUPABASE_URL "$TARGET"
  printf '%s' "<ANON_KEY>"                | vercel env add VITE_SUPABASE_ANON_KEY "$TARGET"
done
```

All three targets, every time. Skipping `preview` is the classic version of
this mistake and produces a site that works in production and breaks on every
branch.

First deploy:

```
vercel --prod
```

### Step 6: CI secrets

```
gh secret set SUPABASE_PROJECT_REF  --body "<REF>"
gh secret set SUPABASE_DB_PASSWORD  --body "<DB_PASSWORD>"
gh secret set SUPABASE_ACCESS_TOKEN --body "<TOKEN_FROM_THE_DASHBOARD>"
```

Until these exist, `.github/workflows/deploy.yml` builds and type-checks on
every push but skips the database half with a notice rather than failing. That
is deliberate, so the workflow is harmless before it is configured.

### Step 7: schema, functions, verify

```
npm run deploy -- --yes
npm run doctor
```

> **You should see** doctor report every line healthy, and the live site's
> status dot green.

---

## How a push becomes a deploy

```
git push origin main
      │
      ├──────────────▶ Vercel Git integration
      │                  runs npm run build, publishes the front end
      │
      └──────────────▶ GitHub Actions (.github/workflows/deploy.yml)
                         build     type-check, always
                         database  supabase db push + functions deploy
                         web       skipped unless VERCEL_TOKEN is set
```

The front end and the database are deployed by two different systems, which is
worth holding onto because it explains most confusion. Vercel's Git integration
owns the front end and needs no secrets. The workflow owns the database and
needs three.

**If you would rather have one pipeline own everything**, set `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets and run
`vercel git disconnect`. The workflow's `web` job then builds and deploys the
front end itself, after the migrations, so ordering becomes guaranteed rather
than coincidental. Setting the token *without* disconnecting gives you two
deploys per push, racing each other.

The workflow also has `workflow_dispatch`, so you can trigger a full deploy
with no commit:

```
gh workflow run deploy.yml
gh run watch
```

---

## Operating it: complaint to command

The owner's vocabulary will not match the system's. This table is the
translation layer. In every row, run `npm run doctor` first anyway.

| What they say | What it usually is | What to do |
| --- | --- | --- |
| "The site is down" | Nine times out of ten the site is up and Supabase is paused after a week idle | `npm run doctor`. If the Supabase API line fails, restore the project in the dashboard, then set up the keep-alive in [06](06-deploying-supabase.md) so it stops recurring |
| "There's a red dot" | The status box; Supabase unreachable or the key is wrong | `npm run doctor` reports which |
| "It says orange" / "not configured" | Env vars missing from the Vercel build, or the schema was never applied | `npm run doctor`, then `npm run deploy:db`. If production says unconfigured but local works, the env vars were added after the last build: `vercel --prod` to rebuild |
| "My change didn't show up" | Never pushed, or the build failed | `git status`, then `vercel ls` for the last deployment's state |
| "It was working yesterday" | The seven-day pause, or an expired token | `npm run doctor` |
| "It's slow" | Free-tier cold start on a paused or idle project | Check the pause state; this is a plan limitation, not a bug |
| "Can you add X" | Feature work | Branch, build, `npm run deploy`. Preview URLs let them look before it is live |
| "Undo that" | Rollback | Front end: `vercel rollback` (check `vercel rollback --help`, the flags move), or promote the previous deployment. Database: write a new migration that reverses it; never edit or revert an applied one |
| "It's asking me to log in" | Supabase Auth, once admin login exists | Not yet implemented; see the intended scope in the README |

Two habits worth keeping:

- **Report the doctor output, not a conclusion.** "The Supabase API line says
  no response, which means the project is paused; restoring it now" is useful.
  "Should be fixed" is not, and the owner has no way to check your work.
- **Translate, do not paste.** A stack trace or a `PGRST205` means nothing to
  them. Say which part broke, what you did, and what they should now see on
  the page.

---

## Rules

Things to hold to even when the owner asks otherwise, because they cannot
evaluate the risk and you can:

1. **No secrets in the repository.** `.env.local` is git-ignored; keep it that
   way. Never give a service-role or secret key a `VITE_` prefix, because every
   `VITE_` variable is compiled into the public bundle.
2. **Migrations are append-only.** Never edit one that has been applied. A
   correction is a new numbered file.
3. **Never `supabase db reset` against the linked project.** That is the
   production database and the command destroys it.
4. **Never force past schema drift.** If `db push` reports a mismatch, run
   `npm run db:diff` to import what the live database actually has, and say so.
   Forcing loses data.
5. **Build before you push.** `npm run build` type-checks, so it catches
   exactly what Vercel would fail on.
6. **Enable row level security on every new table**, with explicit policies.
   `supabase/migrations/0001_init.sql` is the pattern.
7. **Do not make the repository public** without being asked. It is private for
   a reason.

## Escalate to the owner

You cannot do these, so ask rather than working around them:

- Anything needing a payment method: a custom domain, the Supabase or Vercel
  paid tiers.
- Anything behind their login or 2FA, including minting the Supabase access
  token.
- Deleting data, dropping a table, or resetting the database.
- Making the repository public, or adding collaborators.
- Any decision that costs money or changes who can see the site.

---

Next: **[08-data-sources.md](08-data-sources.md)** for the external APIs this
site will most likely use.
