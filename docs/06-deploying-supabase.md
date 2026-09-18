# 6. Deploying the Supabase schema and functions

**Audience:** whoever picks this up next, human or coding agent. This guide is
written to be handed over verbatim.

**Goal:** get the contents of the `supabase/` folder running on the live
Supabase project, and know how to do it again for future changes.

**Prerequisites:** guides 4 and 5 finished. A Supabase project exists and the
deployed site can reach it.

---

## For a coding agent: the short version

If you are an agent and the human has already completed guides 1 through 5,
this is the whole task.

```
Goal: apply supabase/migrations/*.sql and deploy supabase/functions/* to the
      live Supabase project.

1. Read supabase/migrations/0001_init.sql and supabase/functions/hello-cerebus/index.ts.
2. Ask the human for: the project ref (the subdomain of VITE_SUPABASE_URL in
   .env.local) and the database password from guide 4, step 3.
3. npm install --save-dev supabase
4. npx supabase init          # only if supabase/config.toml is absent
5. npx supabase login         # opens a browser; the human completes it
6. npx supabase link --project-ref <ref>
7. npx supabase db push
8. npx supabase functions deploy hello-cerebus
9. Verify per "Verifying it worked" below. Report the status dot color and the
   function's JSON response.

Constraints:
- Never write a service-role or secret key into any file in this repository,
  and never into a VITE_-prefixed variable.
- Do not edit an already-applied migration. Add a new numbered file instead.
- If `db push` reports a schema drift or a conflicting migration, stop and
  report rather than passing --force or resetting the database.
```

The rest of this document is the explanation behind those steps.

---

## Why this is a separate step

Guide 5 built a pipeline where pushing to GitHub updates the website. It does
not touch Supabase. Vercel builds your front-end code; it has no permission to
alter your database, which is a good thing. Nobody wants a typo in a React
component to drop a table.

So database changes are deployed deliberately, by a separate action. That
action is one command once set up, and the optional automation at the end of
this guide can fold it into the same push if you decide you want that.

## What is in the `supabase/` folder

```
supabase/
├── migrations/
│   └── 0001_init.sql              schema changes, applied in filename order
└── functions/
    └── hello-cerebus/
        └── index.ts               an HTTP endpoint running on Supabase
```

**`0001_init.sql`** creates a `messages` table with three columns, enables Row
Level Security on it, and adds a policy allowing anyone to read it. The
homepage's status box reads this table, which is how the green dot gets earned.

Row Level Security deserves a sentence, because it is the one Supabase concept
that bites people. A new table has RLS disabled, meaning anyone holding the
publishable key, which is to say anyone on the internet, can read and write it.
Enabling RLS flips that to deny-everything, and policies then grant back
specific access. The migration enables it and grants public *read* only. There
is no write policy, so the browser cannot insert rows. **Every table you add
should follow this pattern.**

**`hello-cerebus/index.ts`** is an example Edge Function: an HTTP endpoint
running on Supabase's servers, in Deno rather than Node. Use these for anything
that must not happen in a browser, such as work needing the secret key, calls
to third-party APIs with private credentials, or webhook receivers. This one
counts the rows in `messages` and returns JSON.

---

## Path A: the database only, no tooling

If all you need is the schema and you would rather not install anything, this
takes two minutes.

1. Open your project at <https://supabase.com/dashboard>.
2. Click **SQL Editor** in the left sidebar, then **New query**.
3. Open `supabase/migrations/0001_init.sql`, copy its entire contents, and
   paste them into the editor.
4. Click **Run**.

> **You should see** `Success. No rows returned`.

5. Click **Table Editor** in the sidebar.

> **You should see** a `messages` table containing one row reading "Hello from
> Supabase."

That is the schema deployed. Jump to **Verifying it worked**.

The limits of this path: it does not deploy edge functions, and it keeps no
record of what has been applied, so you have to remember which migrations you
have run. Fine for one file, unpleasant by the fifth. Path B is the durable
answer.

---

## Path B: the Supabase CLI

This handles migrations and functions, and tracks which migrations are already
applied.

### Step 1: Install it

Installing into the project is preferred over installing globally, so the
version is pinned in `package.json` and everyone gets the same one:

```
$ npm install --save-dev supabase
```

Every command below is then prefixed with `npx`. Commit the resulting
`package.json` and `package-lock.json` change.

### Step 2: Initialize the local config, if needed

```
$ ls supabase/config.toml
```

If that file does not exist, create it:

```
$ npx supabase init
```

This writes `supabase/config.toml` alongside the existing `migrations` and
`functions` folders, leaving them untouched. Commit the new file.

### Step 3: Log in

```
$ npx supabase login
```

A browser window opens for you to authorize the CLI. It stores a token on your
machine, outside the repository.

> **You should see** `Finished supabase login.`

### Step 4: Link the folder to your project

You need your **project ref**, the subdomain of your Supabase URL. If
`VITE_SUPABASE_URL` is `https://abcdefghijklmnop.supabase.co`, the ref is
`abcdefghijklmnop`. It is also shown under **Project Settings** → **General**.

```
$ npx supabase link --project-ref abcdefghijklmnop
```

It prompts for the database password from guide 4, Step 3. Nothing is echoed as
you type, which is expected.

> **You should see** `Finished supabase link.`

### Step 5: Push the migrations

```
$ npx supabase db push
```

It lists the migrations that will be applied and asks for confirmation.

> **You should see** `Applying migration 0001_init.sql...` followed by
> `Finished supabase db push.`

### Step 6: Deploy the function

```
$ npx supabase functions deploy hello-cerebus
```

> **You should see** a bundling and upload log, ending with a dashboard link
> for the deployed function.

To deploy every function in the folder at once, omit the name:
`npx supabase functions deploy`.

---

## Verifying it worked

**The database.** Reload your live `.vercel.app` URL with a hard refresh.

> **You should see** a **green** dot: "Supabase connected. Read 1 row from the
> `messages` table."

That single sentence confirms the entire stack: GitHub holds the code, Vercel
built and served it with the right environment variables, and the browser
queried your database through a policy that permitted it.

**The function.** Substitute your ref and publishable key:

```
$ curl -H "Authorization: Bearer YOUR_ANON_KEY" \
    https://YOUR-REF.supabase.co/functions/v1/hello-cerebus
```

> **You should see** `{"greeting":"Hello from Team Cerebus.","messages":1}`

Function logs live under **Edge Functions** → `hello-cerebus` → **Logs** in the
dashboard, and are the place to look when one misbehaves.

---

## Making changes later

### A new table or column

1. Create a new file in `supabase/migrations/`, numbered after the last one:
   `0002_add_projects_table.sql`.
2. Write the SQL. Enable RLS and add a policy for anything the browser will
   touch.
3. `npx supabase db push`
4. Commit the file.

**Never edit a migration that has already been applied.** The CLI records
applied migrations by filename; changing one that ran means your local files and
the live database disagree, and `db push` will start refusing to work. Corrections
go in a new migration.

A sketch of the pattern to copy:

```sql
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects are publicly readable"
  on public.projects for select to anon, authenticated using (true);
```

### A new function

```
$ npx supabase functions new my-function
$ npx supabase functions deploy my-function
```

Then commit the generated folder.

### Pulling changes made in the dashboard

If someone edits the schema through the Table Editor, your migration files fall
behind. Recover them with:

```
$ npx supabase db pull
```

This writes the difference into a new migration file. Commit it. Doing this
promptly is much easier than reconstructing months of dashboard edits later.

---

## Optional: keep the project awake with a webhook

Guide 4 noted that a free-tier project pauses after about a week with no
activity, and that a paused project turns the live site's status dot red. There
is a way around that which is useful in its own right: give the project a small
but steady stream of real traffic.

The mechanism is straightforward. Some outside service sends an HTTP request to
an edge function whenever something happens at its end. The function writes a
row to a table. That write is database activity, so the inactivity clock
resets and the project stays awake. You also end up with a stored log of
whatever you subscribed to, which is usually why you wanted the webhook in the
first place.

The example this was written for is the Alphapedia PokeMMO webhook, but nothing
below depends on which service is sending. The receiver stores whatever JSON
arrives, so the same table and function work just as well for a GitHub
repository webhook, a status page, a form service, or anything else that lets
you paste in a URL.

### Step 1: a table to store the events

New migration, `supabase/migrations/0002_webhook_events.sql`:

```sql
create table if not exists public.webhook_events (
  id         bigint generated always as identity primary key,
  source     text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists webhook_events_source_created_at_idx
  on public.webhook_events (source, created_at desc);

-- RLS on with no policies at all: nothing holding the publishable key can read
-- or write this table. The receiver function below uses the service-role key,
-- which bypasses RLS, so it needs no policy. Event payloads often carry more
-- than you would want public, so deny-by-default is the right posture here.
alter table public.webhook_events enable row level security;
```

The `payload jsonb` column is doing the real work. Storing the body untouched
means you do not have to know its shape in advance, and a change at the sending
end cannot break the receiver.

Apply it with `npx supabase db push`.

### Step 2: the receiver function

`supabase/functions/webhook-receiver/index.ts`:

```ts
// @ts-nocheck -- Deno runtime, not type-checked by this repo's tsconfig.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SHARED_SECRET = Deno.env.get('WEBHOOK_SECRET')

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // This endpoint has to be public, so it needs a check of its own. Without
  // one, anyone who learns the URL can fill your table.
  const url = new URL(req.url)
  if (!SHARED_SECRET || url.searchParams.get('token') !== SHARED_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response('Expected a JSON body', { status: 400 })
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await client.from('webhook_events').insert({
    source: url.searchParams.get('source') ?? 'unknown',
    payload,
  })

  if (error) {
    console.error('webhook insert failed:', error.message)
    return new Response('Storage failed', { status: 500 })
  }

  // Senders retry on anything that is not a 2xx, so answer quickly and keep
  // the body empty.
  return new Response(null, { status: 204 })
})
```

A shared secret in the query string is the crudest check that works, chosen
because most webhook senders give you one field to paste a URL into and nothing
else. If your sender signs its requests, verify the signature instead and drop
the token. If it lets you set custom headers, move the secret into one and read
it with `req.headers.get('x-webhook-token')`.

Generate a secret and keep a copy, because Supabase will not show it to you
again:

```
$ openssl rand -hex 24
```

Put the output in your password manager, then set it on the project:

```
$ npx supabase secrets set WEBHOOK_SECRET=the-value-you-just-generated
```

Deploy with JWT verification turned off. A third-party sender will not include
a Supabase `Authorization` header, so without this the request is rejected
before your code runs:

```
$ npx supabase functions deploy webhook-receiver --no-verify-jwt
```

Better, record it in `supabase/config.toml` so future deploys do not need the
flag and nobody has to remember it:

```toml
[functions.webhook-receiver]
verify_jwt = false
```

### Step 3: point the sender at it

Your webhook URL, with your own project ref and secret substituted in:

```
https://YOUR-REF.supabase.co/functions/v1/webhook-receiver?token=YOUR_SECRET&source=alphapedia
```

Paste that into whatever the sending service calls its webhook, callback, or
notification URL. The `source` parameter is free text, and exists only so that
a second sender added later can be told apart in the table.

Test it yourself before wiring up the real sender:

```
$ curl -X POST -H "Content-Type: application/json" \
    -d '{"hello":"world"}' \
    "https://YOUR-REF.supabase.co/functions/v1/webhook-receiver?token=YOUR_SECRET&source=manual-test"
```

> **You should see** no output at all, which is what a 204 looks like to
> `curl`. Then open the dashboard's **Table Editor** and select
> `webhook_events`: there should be one row, with `{"hello":"world"}` in the
> `payload` column.

Add `-i` to the `curl` command if you want to see the status code.

### Step 4: a heartbeat you can rely on

Here is the honest limitation. A webhook only keeps the project awake if it
actually fires at least once every seven days. A sender that goes quiet over a
holiday takes your database down with it, and anything tied to activity in a
game will have quiet stretches.

So put a guaranteed heartbeat alongside it rather than depending on the
sender's rhythm.

First enable the two extensions it needs, under **Database** → **Extensions**
in the dashboard: `pg_cron` to run the schedule and `pg_net` to make an HTTP
request from inside the database. The Cron interface offers to enable them for
you if you go that route.

Then create a daily job. In the dashboard, **Integrations** → **Cron** (older
dashboards put this under **Database** → **Cron Jobs**), with this as the
command:

```sql
select net.http_post(
  url  := 'https://YOUR-REF.supabase.co/functions/v1/webhook-receiver?token=YOUR_SECRET&source=heartbeat',
  body := '{"ping":true}'::jsonb
);
```

Or set the whole thing up from the **SQL Editor** in one statement, which is
less exposed to dashboard redesigns:

```sql
select cron.schedule(
  'supabase-keepalive',
  '17 6 * * *',
  $$
  select net.http_post(
    url  := 'https://YOUR-REF.supabase.co/functions/v1/webhook-receiver?token=YOUR_SECRET&source=heartbeat',
    body := '{"ping":true}'::jsonb
  );
  $$
);
```

Note what that request does: it leaves the database, goes out to the internet,
and comes back in through the public function URL, so it arrives as genuine
external API traffic and ends in a real write. A job that only touched a table
internally would be a weaker signal, since the pause check is about traffic to
the project rather than activity inside it. Running daily also leaves seven
times the margin you need, so a single missed run is harmless.

External schedulers work too: a GitHub Actions workflow on a `schedule`
trigger, cron-job.org, or an uptime monitor pointed at the URL. One caveat on
the GitHub Actions route, because it catches people out: GitHub disables
scheduled workflows in a repository with no commits for 60 days, so the thing
keeping your database awake stops without telling you.

Finally, trim the table so a daily heartbeat does not accumulate forever.
Another cron job, weekly:

```sql
delete from public.webhook_events
where created_at < now() - interval '30 days';
```

### What to expect from this

- A project taking a write every day does not pause, and the status dot on the
  live site stays green indefinitely.
- At these volumes none of it costs anything. A few thousand small rows and one
  function invocation a day sit far inside the free plan's limits.
- Be clear-eyed about what this is. A real integration storing real data is
  ordinary usage of the service, and the project is being used rather than
  tricked. A bare ping that exists only to defeat the timer is a gray area that
  Supabase is free to close, so do not build anything load-bearing on the
  assumption that today's pause rules hold forever.
- If this site ever matters enough that an unexpected pause would be a real
  problem, the supported answer is the paid tier rather than a cleverer
  heartbeat.

---

## Deploying Supabase on push

This is already wired up. `.github/workflows/deploy.yml` runs on every push to
`main` and applies migrations, then deploys edge functions.

It is safe to have in the repository before anything is configured, because it
checks for its own credentials first and skips the database half with a notice
rather than failing. A fresh clone gets a green build, not a wall of red email.
To switch it on, set three repository secrets:

| Secret                  | Where it comes from                                |
| ----------------------- | -------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | <https://supabase.com/dashboard/account/tokens>    |
| `SUPABASE_DB_PASSWORD`  | The password from guide 4, Step 3                  |
| `SUPABASE_PROJECT_REF`  | The subdomain of your Supabase URL                 |

Over the CLI:

```
$ gh secret set SUPABASE_PROJECT_REF  --body "<REF>"
$ gh secret set SUPABASE_DB_PASSWORD  --body "<DB_PASSWORD>"
$ gh secret set SUPABASE_ACCESS_TOKEN --body "<TOKEN>"
```

Or in the browser: repository **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**.

Check which are set with `gh secret list`, or just run `npm run doctor`, which
reports the missing ones by name.

### Or deploy by hand

`npm run deploy` does the same work from your machine, in the same order, and
adds a confirmation step and a migration dry run before it changes anything:

```
$ npm run deploy -- --dry-run   # show the plan, change nothing
$ npm run deploy                # lint, build, migrate, deploy functions, push
```

[07-agent-runbook.md](07-agent-runbook.md) covers both paths in more detail.

### The trade you are making

Understand it before leaning on the automatic path. Automatic migrations mean a
mistaken migration reaches production the moment it is pushed, and a database,
unlike a deployment, does not roll back with a button. The workflow prints a
dry run into the job log before it pushes, which helps after the fact but stops
nothing.

For a project this size, `npm run deploy` from a machine is the safer default,
and leaving the three secrets unset is a legitimate choice rather than an
unfinished setup. If the site grows enough that hand-deploying becomes the
bottleneck, Supabase's branching feature is the better answer than trusting a
migration on every push.

---

## Troubleshooting

**`Cannot find project ref. Have you run supabase link?`**
Run Step 4. It must be run in the folder containing `supabase/`.

**`failed SASL auth` or `password authentication failed` during link or push**
Wrong database password. This is not your Supabase login password. Reset it
under **Project Settings** → **Database** → **Reset database password** and
relink.

**`Remote migration versions not found in local migrations directory`**
The live database has migrations your folder does not, usually because someone
applied SQL through the dashboard. Run `npx supabase db pull` to import them,
then push again.

**`relation "messages" already exists`**
The migration was applied twice, probably once through Path A and once through
Path B. Harmless in itself. To get the CLI's bookkeeping straight, run
`npx supabase migration repair --status applied 0001`.

**The status dot stays orange after a successful `db push`**
Two likely causes. The browser cached the old bundle, so hard-refresh. Or the
RLS policy is missing while the table exists, in which case the error is a
permission failure rather than a missing table. Confirm in **Authentication** →
**Policies** that `messages` has a select policy.

**The function returns 401**
The `Authorization: Bearer` header is missing or holds the wrong key. Edge
functions require one by default. A genuinely public endpoint can be deployed
with `--no-verify-jwt`.

**The function returns 500**
Read **Edge Functions** → **Logs** in the dashboard. The usual cause is the
function running before the migration, so `messages` does not exist.

**`supabase: command not found`**
Use `npx supabase ...` rather than `supabase ...` when it is installed as a dev
dependency.

**The webhook sender reports a 401**
Either the token does not match, or the function was deployed without
`--no-verify-jwt`, in which case Supabase rejected the request before your code
ran. **Edge Functions** → **Logs** distinguishes the two: your own 401 appears
in the logs, a platform-level rejection does not.

**Every stored row has a `source` of `unknown`**
The sender is not passing `?source=...`, or it strips query parameters from the
URL you gave it. A few do. If so, move both the token and the source into
headers and read them with `req.headers.get(...)`, or hard-code the source in
the function.

**The sender reports success but no rows appear**
The insert is failing while the function still returns 2xx, or the table does
not exist yet. Check **Edge Functions** → **Logs** for the
`webhook insert failed` line, and confirm `0002_webhook_events.sql` was pushed.

**The project paused anyway, despite the cron job**
Confirm the job actually ran. In the **SQL Editor**:
```sql
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 10;
```
An empty result means the job was never scheduled. A `failed` status with a
message about `net` means `pg_net` is not enabled.

**`schema "net" does not exist`**
Enable the `pg_net` extension under **Database** → **Extensions**.

---

## Where to look things up

- Supabase docs: <https://supabase.com/docs>
- Supabase CLI reference: <https://supabase.com/docs/reference/cli>
- Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Edge Functions: <https://supabase.com/docs/guides/functions>
- Scheduling with Supabase Cron: <https://supabase.com/docs/guides/cron>
- HTTP requests from Postgres (`pg_net`): <https://supabase.com/docs/guides/database/extensions/pg_net>
- Free-plan limits and project pausing: <https://supabase.com/docs/guides/platform/billing-on-supabase>
- Vercel docs: <https://vercel.com/docs>
- Vite environment variables: <https://vite.dev/guide/env-and-mode>

---

Next, for whoever maintains this rather than sets it up:
**[07-agent-runbook.md](07-agent-runbook.md)** for operating the stack from the
command line, and **[08-data-sources.md](08-data-sources.md)** for the Pokémon
APIs the guild features will need.

Good luck.
