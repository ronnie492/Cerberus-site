# 3. Create a Vercel account and publish the site

**Goal:** the Team Cerebus page live on the internet at a real URL, rebuilt
automatically every time you push to GitHub.

**What Vercel does:** your repository contains source code, not a website. Some
machine has to run `npm run build` to turn it into plain HTML, CSS, and
JavaScript, then serve those files to visitors. Vercel is that machine. It
watches your GitHub repo and redoes the job on every push.

**Time:** 10 minutes. Most of it is waiting for the first build.

**Prerequisite:** guide 2 finished, with your code visible on GitHub.

---

## Step 1: Sign up with GitHub

1. Go to **<https://vercel.com/signup>**.
2. Choose the **Hobby** plan, then click **Continue with GitHub**.

   Signing up through GitHub rather than with an email and password matters:
   it establishes the link between the two services that makes automatic
   deployment work, and it saves you a connection step later.
3. GitHub asks you to authorize Vercel. Click **Authorize Vercel**.
4. Enter a name for yourself when prompted. This becomes your Vercel scope
   name, visible in URLs.

> **You should see** the Vercel dashboard, largely empty, offering to import a
> project.

### About the free plan

Hobby is free, with generous limits for a site this size, and Vercel's terms
restrict it to **non-commercial** use. A team page is usually fine. If Team
Cerebus starts selling something through this site, you are expected to move to
the Pro plan. Worth knowing now rather than discovering by email later.

## Step 2: Install the Vercel GitHub app

Vercel needs permission to read your repository and to receive a notification
when you push.

1. If a **Install GitHub App** or **Configure GitHub App** button appears
   during import, click it. Otherwise go straight to
   **<https://github.com/apps/vercel/installations/new>**.
2. Choose your account when asked where to install it.
3. Select **Only select repositories** and pick `cerebus-site`. Granting access
   to all repositories also works, but narrower is better practice.
4. Click **Install**.

## Step 3: Import the repository

1. On the Vercel dashboard, click **Add New...** → **Project**.
2. Your repositories are listed. Find `cerebus-site` and click **Import**.

   Not listed? Click **Adjust GitHub App Permissions** and confirm the
   repository was selected in Step 2.

## Step 4: Check the build settings

Vercel inspects the repository and fills these in for you. Verify rather than
change:

| Setting              | Expected value  |
| -------------------- | --------------- |
| **Framework Preset** | `Vite`          |
| **Root Directory**   | `./` (empty)    |
| **Build Command**    | `npm run build` |
| **Output Directory** | `dist`          |
| **Install Command**  | `npm install`   |

These same values are written into `vercel.json` in the repository, so they
should match automatically.

**Leave Environment Variables empty for now.** You do not have the Supabase
keys yet. Guide 5 comes back and adds them. The site builds and deploys fine
without them; the homepage will simply report that Supabase is unconfigured.

## Step 5: Deploy

Click **Deploy**.

The build takes one to three minutes. You will watch a log scroll past. Lines
about deprecation warnings during `npm install` are normal and harmless.

> **You should see** a congratulations screen with a screenshot of your site,
> and one or more URLs of the form `cerebus-site.vercel.app` and
> `cerebus-site-<random>-<your-scope>.vercel.app`.

Click the URL.

> **You should see** the **Team Cerebus** page, with an orange status dot
> reading "Supabase not configured". That is the correct state at this point in
> the process.

## Step 6: Confirm that pushing redeploys

This is the whole point, so test it rather than trusting it.

1. In the project folder, make a visible change. Open `src/App.tsx` and edit
   the tagline text, or ask your agent: "change the tagline on the homepage to
   mention the deployment is live".
2. Commit and push:
   ```
   $ git add .
   $ git commit -m "Test automatic deployment"
   $ git push
   ```
3. Go to your project on the Vercel dashboard and open the **Deployments** tab.

> **You should see** a new deployment appear within a few seconds, marked
> **Building**, turning to **Ready** a minute or two later. Reload your
> `.vercel.app` URL and your change is there.

If that worked, the automatic pipeline described in guide 5 is already
functioning for code. Guide 5 only has to add the Supabase configuration.

---

## Things worth knowing about Vercel

**Production versus preview.** Pushes to `main` update your real site. Pushes
to any other branch produce a **preview deployment**, a separate temporary URL
where you can check work before it goes live. Pull requests get a preview URL
commented onto them automatically.

**Rolling back.** **Deployments** tab, find a previous good deployment, open
its `...` menu, choose **Promote to Production** (older interfaces call it
**Rollback**). Every past deployment stays reachable, which makes a bad push
cheap to undo.

**Build logs are the first place to look** when a deployment fails. Click the
failed deployment; the error is nearly always in the last twenty lines.

**Custom domains.** When you own one: **Settings** → **Domains** → **Add**,
then follow the DNS instructions it gives you. Free on the Hobby plan.

---

## Troubleshooting

**The build fails with `tsc` errors but works on my machine**
Almost always a file that exists locally and was never committed. Run
`git status` and look for untracked files. TypeScript errors also surface on
Vercel because `npm run build` type-checks before building; run `npm run build`
locally to see the same failures.

**The build fails with `Cannot find module` for something in `package.json`**
Commit your `package-lock.json`. Vercel installs from it, and without it the
installed versions can differ from yours.

**The deployed page is blank and the browser console shows a 404 for a `.js`
file**
The Output Directory is wrong. It must be `dist`. Fix it under **Settings** →
**Build and Deployment**, then redeploy.

**Navigating to a sub-path gives a 404**
The single-page-app rewrite is missing. The `rewrites` block in `vercel.json`
handles this; confirm that file was committed.

**The build fails with an error about the Node.js version**
**Settings** → **Build and Deployment** → **Node.js Version**, and pick the
most recent option offered (22.x or newer).

**Pushes to GitHub no longer trigger deployments**
The GitHub app connection has lapsed. Vercel project **Settings** → **Git**
shows the connected repository; disconnect and reconnect it, then push again.

**I want to delete everything and start over**
Vercel project **Settings**, scroll to the bottom, **Delete Project**. Deleting
a Vercel project does not touch your GitHub repository or your code. Re-import
whenever you like.

---

Next: **[04-supabase-setup.md](04-supabase-setup.md)**
