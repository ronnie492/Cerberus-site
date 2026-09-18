# 5. Connect everything

**Goal:** one pipeline, where pushing code to GitHub updates the live site and
the live site can reach the database.

**Prerequisites:** guides 2, 3, and 4 finished. You have a GitHub repo, a
deployed Vercel site, and a Supabase project whose keys work locally.

**Time:** 10 minutes.

---

## What you are building

```
   you edit code
        │
        │  git push
        ▼
   ┌──────────┐   webhook    ┌──────────┐
   │  GitHub  │ ───────────▶ │  Vercel  │  runs npm run build
   └──────────┘              └────┬─────┘  serves the result
                                  │
                            visitor loads page
                                  │
                                  ▼
                            ┌──────────┐
                            │ Supabase │  database + API
                            └──────────┘
```

Two of the three connections already exist. GitHub to Vercel was made when you
imported the repository in guide 3, and you verified it with a test push. The
browser to Supabase connection works locally, from `.env.local`.

The missing piece is that Vercel has never seen your Supabase keys. `.env.local`
is git-ignored, so it was never pushed, which is correct. Vercel needs its own
copy, entered by hand, once.

## Step 1: Add the environment variables to Vercel

1. Open <https://vercel.com/dashboard> and click your `cerebus-site` project.
2. **Settings** → **Environment Variables**.
3. Add the first variable:
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** your project URL, the same one in `.env.local`
   - **Environments:** tick **Production**, **Preview**, and **Development**.
     All three. Leaving Preview out is the most common version of this mistake,
     and it produces a site that works in production but breaks on every
     branch preview.
   - Click **Save**.
4. Add the second the same way:
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** your publishable/anon key
   - **Environments:** all three.

> **You should see** both variables listed, values hidden behind asterisks.

The fastest way to avoid typos is to copy each value out of `.env.local` rather
than out of the Supabase dashboard a second time, since `.env.local` is already
proven to work.

## Step 2: Redeploy

**Environment variables are read at build time, not when a visitor loads the
page.** Your currently-live site was built before these existed, so it still
has no idea about them. Saving them changes nothing until you rebuild.

1. Go to the **Deployments** tab.
2. Find the deployment at the top, marked **Production**.
3. Open its `...` menu and choose **Redeploy**.
4. In the dialog, leave **Use existing Build Cache** unticked and confirm.

Wait for **Ready**.

## Step 3: Verify the whole chain

Open your `.vercel.app` URL, forcing a fresh load with `Cmd`/`Ctrl` + `Shift` +
`R`.

> **You should see** the Team Cerebus page with an **orange** dot reading
> "Supabase reachable, schema not applied."

That message is the proof you want. It can only appear if the deployed
JavaScript received your keys and successfully made a request to your Supabase
project. The remaining complaint is about the database schema, which guide 6
applies.

If the dot instead says "Supabase not configured", the build did not see the
variables. See Troubleshooting.

## Step 4: Confirm the full loop once

A last end-to-end check, so you know the pipeline works before you rely on it.

1. Make a small visible edit, for example the tagline in `src/App.tsx`.
2. Commit and push it:

   ```
   $ git add .
   $ git commit -m "Confirm end-to-end pipeline"
   $ git push
   ```

3. Watch the Vercel **Deployments** tab.

> **You should see** a build start on its own, reach **Ready**, and your change
> appear on the live URL. No dashboard clicking involved.

That is the handover complete for the front end. From here, shipping a change
means committing and pushing.

---

## The rules this pipeline runs on

Four things to keep in mind, because they explain most future confusion:

1. **Push to `main`, get production.** Push to any other branch, get a
   temporary preview URL instead. Use branches when you want to look before you
   leap.
2. **A failed build does not take the site down.** Vercel keeps serving the
   last successful deployment. A broken push is a non-event for visitors.
3. **Every `VITE_` variable is public.** They are compiled into the JavaScript
   bundle that anyone can read with view-source. The Supabase publishable key is
   designed for this. A secret key never belongs in one.
4. **Changing an environment variable requires a redeploy.** Every time. This
   is the single most common "but I changed it and nothing happened" in this
   stack.

## Adding a variable later

The same value has to be added in two places, and forgetting one is the usual
bug:

- `.env.local` for local development, then restart `npm run dev`.
- Vercel **Settings** → **Environment Variables** for the deployed site, then
  redeploy.

Also add it to `.env.example` with a placeholder value, so the next person
knows it is required.

---

## Troubleshooting

**The live site says "Supabase not configured" but local works**
The variables were saved after the last build. Redo Step 2, and untick the
build cache. To confirm what the build actually saw, open the deployment's
build log and check that the variable names are listed.

**It works in production but not on a preview URL**
The variables were not enabled for the **Preview** environment. Edit each one
and tick it.

**`Invalid API key` only on the deployed site**
A copy-paste error, usually a leading or trailing space, or a value that was
truncated. Delete both variables, re-add them by copying from `.env.local`, and
redeploy.

**Pushes stopped triggering builds**
Check Vercel project **Settings** → **Git** for the connected repository, and
confirm the Vercel GitHub app is still installed at
<https://github.com/settings/installations>.

**Two deployments start for every push**
The repository is connected to two Vercel projects, usually from importing it
twice. Delete the project you do not want.

---

Next: **[06-deploying-supabase.md](06-deploying-supabase.md)**
