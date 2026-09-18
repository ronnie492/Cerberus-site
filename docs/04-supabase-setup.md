# 4. Create a Supabase project

**Goal:** a live Supabase project, plus the two values the website needs in
order to talk to it.

**What Supabase is:** a hosted PostgreSQL database with an HTTP API generated
on top of it, so your React code can query the database directly without you
writing a backend server. It also provides user accounts, file storage, and
small server-side functions. Think of it as the entire back end of the site.

**Time:** 10 minutes.

---

## Step 1: Create the account

1. Go to **<https://supabase.com/dashboard/sign-up>**.
2. Click **Continue with GitHub** and authorize it. Using the GitHub account
   from guide 2 keeps your logins down to one and makes the optional GitHub
   integration in guide 6 straightforward.
3. Confirm your email if prompted.

## Step 2: Create an organization

Supabase asks for one on first login.

- **Name:** `Team Cerebus`
- **Type:** Personal, unless you have a reason otherwise.
- **Plan:** **Free**.

## Step 3: Create the project

Click **New project** and fill in:

- **Name:** `cerebus`
- **Database Password:** click **Generate a password**.

  **Copy this password into a password manager immediately.** The dashboard
  will not show it again. You need it for the command-line database work in
  guide 6, and while it can be reset later, resetting is an extra chore.
- **Region:** whichever is physically closest to most of your visitors. This is
  the one choice here you cannot change afterward without creating a new
  project. For a US team, an East or West US region.
- **Pricing plan:** Free.

Click **Create new project** and wait. Provisioning takes one to three minutes
while it starts a real database for you.

> **You should see** the project dashboard, with the setup spinner replaced by
> a project home page listing your API URL.

## Step 4: Collect the two values you need

The website needs exactly two strings.

1. In the left sidebar, click the gear icon (**Project Settings**).
2. Click **API Keys** (older dashboards label this section **API**).
3. Find these two:

| What to copy            | Looks like                                      |
| ----------------------- | ----------------------------------------------- |
| **Project URL**         | `https://abcdefghijklmnop.supabase.co`          |
| **Publishable/anon key** | `sb_publishable_...` or a long `eyJ...` string  |

Naming depends on how new your project is. Newer projects show a
**Publishable key** starting `sb_publishable_`; older ones show an **anon
public** key that is a long JWT beginning `eyJ`. Either works with this code.
The Project URL may live under **Project Settings** → **General** or **Data
API** rather than beside the keys.

**Do not copy the secret key** (`sb_secret_...` or `service_role`). It bypasses
all database security rules. It belongs only in server-side code, never in a
browser and never in this repository. Guide 6 covers the one place it is used,
where Supabase supplies it automatically so you never handle it yourself.

## Step 5: Put them in your local environment file

Back in the project folder, copy the template:

```
$ cp .env.example .env.local
```

On Windows PowerShell, `copy .env.example .env.local`.

Open `.env.local` in any text editor and paste your two values in, replacing
the placeholders. The result should look like:

```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

Rules that cause most of the mistakes here:

- No quotation marks, no spaces around the `=`.
- No trailing slash on the URL.
- The variable names must be exactly as shown. Vite only exposes variables
  beginning with `VITE_` to the browser, so a typo in the prefix means the
  value silently does not exist.

`.env.local` is listed in `.gitignore`, so it stays on your machine and is
never pushed. That is intentional: Vercel gets its own copy of these values
through the dashboard in guide 5.

## Step 6: Check the connection

```
$ npm run dev
```

Open the address it prints, usually `http://localhost:5173/`.

> **You should see** the Team Cerebus page with an **orange** status dot saying
> "Supabase reachable, schema not applied."

That is exactly right, and it is worth understanding why: your keys work and
the browser is talking to your database, but the `messages` table does not
exist yet because nobody has applied the schema. Guide 6 does that, and the dot
turns green.

If the dot is still orange with "Supabase **not** configured", the environment
file was not picked up. Stop the dev server with `Ctrl` + `C` and start it
again; Vite reads `.env.local` only at startup.

---

## Worth knowing about the free plan

**Projects pause after about a week of no activity.** A paused project's API
stops responding, which makes the live site's status box go red. Unpausing is
one button on the dashboard and your data is kept. If this site will sit unused
for long stretches, that is the behavior to expect, and the reason Supabase's
paid tier exists.

There is a practical way to avoid it, described in
[06-deploying-supabase.md](06-deploying-supabase.md) under *Optional: keep the
project awake with a webhook*. In short, a webhook receiver that stores what it
is sent gives the project a steady trickle of real database writes, and a
project being written to does not pause. Worth doing if you have any webhook
worth subscribing to.

**Limits** on the free plan are 500 MB of database storage, 1 GB of file
storage, and two active projects per organization. Far beyond what this proof
of concept needs.

**Your database is a normal PostgreSQL database.** Anything you know about
Postgres applies. The **SQL Editor** in the sidebar gives you a query window
against it, and the **Table Editor** gives you a spreadsheet-style view.

---

## Troubleshooting

**`Invalid API key` in the browser console**
The key was copied incompletely, or the secret key was used by mistake. Recopy
the publishable/anon key using the copy button rather than selecting the text
by hand.

**`Failed to fetch` or a CORS error**
Nearly always a malformed `VITE_SUPABASE_URL`: a trailing slash, a missing
`https://`, or the dashboard URL (`supabase.com/dashboard/project/...`) pasted
in place of the API URL. The correct value ends in `.supabase.co` and nothing
more.

**The status box says "not configured" no matter what**
Three things to check, in order. Is the file named exactly `.env.local`, in the
same folder as `package.json`? Do both variable names start with `VITE_`? Was
the dev server restarted after you saved the file?

**I lost the database password**
**Project Settings** → **Database** → **Reset database password**. Harmless;
just remember to save the new one.

**I need to start over**
**Project Settings** → **General** → **Delete project**. Then create a new one.
Nothing outside Supabase is affected, though you will have new keys to
redistribute.

---

Next: **[05-connect-everything.md](05-connect-everything.md)**
