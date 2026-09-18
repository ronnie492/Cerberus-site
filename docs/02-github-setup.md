# 2. Create a GitHub account and a repository

**Goal:** this code living in a GitHub repository that you own, so Vercel has
something to build from.

**Why this matters:** GitHub is the single source of truth. Once guide 5 is
finished, pushing code to GitHub is the *only* action needed to update the live
website. Everything else happens by itself.

**Time:** 15 minutes.

---

## Vocabulary, briefly

Four words that the rest of these guides use constantly:

- **Repository** (or **repo**) A project folder that GitHub tracks, including
  every past version of every file.
- **Commit** A saved snapshot of your changes, with a short message describing
  them.
- **Push** Uploading your commits from your computer to GitHub.
- **Branch** A parallel line of work. This project uses one branch, `main`.

## Step 1: Create the account

1. Go to **<https://github.com/signup>**.
2. Enter your email, a password, and a username. The username becomes part of
   every URL you get, so pick something you will not be embarrassed by.
   Something like `team-cerebus` works well.
3. GitHub emails you an eight-digit code. Enter it.
4. Answer or skip the questions about how you plan to use GitHub.
5. When offered a plan, choose **Free**. It is genuinely sufficient, including
   unlimited private repositories.

## Step 2: Turn on two-factor authentication

GitHub requires this and will lock you out of pushing code if you postpone it.
Do it now rather than in the middle of guide 5.

1. Click your avatar, top right, then **Settings**.
2. In the left sidebar, **Password and authentication**.
3. Under **Two-factor authentication**, click **Enable two-factor
   authentication** and follow the prompts. An authenticator app is the easiest
   route; SMS also works.
4. **Save the recovery codes it shows you.** Put them in a password manager or
   print them. Losing both your phone and these codes means losing the account
   permanently, and no one at GitHub can recover it for you.

## Step 3: Create the repository

1. Click the **+** in the top right, then **New repository**.
2. Fill it in:
   - **Repository name:** `cerebus-site`
   - **Description:** optional.
   - **Visibility:** **Private** is the right default. Vercel works with
     private repos on the free plan. You can switch to Public later.
   - **Initialize this repository with:** leave every box unchecked. No README,
     no `.gitignore`, no license. The code you already have provides all three,
     and pre-filled files cause a conflict on your first push.
3. Click **Create repository**.

> **You should see** a mostly empty page headed "Quick setup" with a URL like
> `https://github.com/your-username/cerebus-site.git`. Leave this tab open. You
> need that URL in Step 5.

## Step 4: Install the GitHub CLI

This handles the login step without you ever pasting a password into a
terminal.

- **macOS** (needs Homebrew from <https://brew.sh>):
  ```
  $ brew install gh
  ```
- **Windows:**
  ```
  $ winget install --id GitHub.cli
  ```
- **Linux:** follow <https://github.com/cli/cli#installation>.

Then sign in:

```
$ gh auth login
```

Answer the prompts: choose **GitHub.com**, then **HTTPS**, then **Yes** to
authenticating Git with your GitHub credentials, then **Login with a web
browser**. Copy the one-time code it prints, press `Return`, paste the code
into the browser page that opens.

> **You should see** `✓ Logged in as your-username` back in the terminal.

Prefer to avoid the terminal entirely? Install **GitHub Desktop** from
<https://desktop.github.com> instead and skip to the Troubleshooting entry
titled *Doing this with GitHub Desktop*.

## Step 5: Push the code

Make sure you are in the project folder first. `pwd` prints where you are:

```
$ pwd
```

> **You should see** a path ending in `/cerebus-site-poc`. If not, `cd` there as
> described in guide 1, Step 4.

Now run these one at a time. Explanations follow; you do not have to understand
them to proceed.

```
$ git init
$ git add .
$ git commit -m "Initial commit: Team Cerebus proof of concept"
$ git branch -M main
$ git remote add origin https://github.com/YOUR-USERNAME/cerebus-site.git
$ git push -u origin main
```

Replace `YOUR-USERNAME` with your actual username. The safest approach is to
copy the URL from the browser tab you left open in Step 3.

What each line does:

| Command             | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| `git init`          | Start tracking this folder's history                     |
| `git add .`         | Stage every file for the next snapshot                   |
| `git commit -m ...` | Take the snapshot, with that message                     |
| `git branch -M main`| Name the branch `main`, which is what Vercel expects     |
| `git remote add`    | Record where on GitHub this code belongs                 |
| `git push -u`       | Upload it                                                |

If `git commit` complains that it does not know who you are, set your identity
once and run the commit again:

```
$ git config --global user.name "Your Name"
$ git config --global user.email "you@example.com"
```

## Step 6: Confirm

Reload the GitHub tab.

> **You should see** the file listing: `docs`, `src`, `supabase`, `README.md`,
> `package.json`, and the rest. The README renders underneath.

Two things worth checking explicitly, because they are the difference between a
safe repository and a leaked one:

- There is **no** `node_modules` folder in the listing. It is excluded on
  purpose and would be tens of thousands of files.
- There is **no** `.env.local` file. If you somehow see one, stop and read the
  Troubleshooting entry *I committed a secret*.

---

## How you will use this from now on

Every time you change the code, the cycle is three commands:

```
$ git add .
$ git commit -m "Describe what changed"
$ git push
```

Or, if you have an agent running, "commit and push this" covers it.

---

## Troubleshooting

**`git: command not found`**
On macOS, run `git --version`, which prompts you to install Apple's developer
tools. On Windows, install Git from <https://git-scm.com/download/win>. On
Linux, `sudo apt install git` or your distribution's equivalent.

**`Authentication failed` on push**
Your GitHub account password does not work for Git operations. Either run
`gh auth login` as in Step 4, or create a Personal Access Token: GitHub
**Settings** → **Developer settings** → **Personal access tokens** → **Tokens
(classic)** → **Generate new token**, tick the `repo` scope, then paste the
token when Git asks for a password.

**`remote origin already exists`**
You ran `git remote add` twice. Fix it in place:
`git remote set-url origin https://github.com/YOUR-USERNAME/cerebus-site.git`

**`Updates were rejected because the remote contains work that you do not have
locally`**
You ticked one of the initialization boxes in Step 3. Easiest fix is to delete
the repository on GitHub (**Settings**, scroll to the bottom, **Delete this
repository**) and recreate it with every box unchecked.

**`src refspec main does not match any`**
The commit in Step 5 did not succeed. Run `git status`, read what it says, and
retry the `git commit` line.

**I committed a secret**
Treat the value as compromised, because it is: repository history keeps it even
after you delete the file. Rotate the key at the service that issued it
(Supabase: **Project Settings** → **API** → the reset option next to the key),
then remove the file from the working tree, commit that, and push. Rotating is
the part that actually protects you.

**Doing this with GitHub Desktop**
Open GitHub Desktop, sign in, choose **File** → **Add local repository**, point
it at this folder, and accept its offer to create a repository. Write a summary
in the bottom left, click **Commit to main**, then **Publish repository** in
the top bar. Untick **Keep this code private** only if you want it public.

---

Next: **[03-vercel-setup.md](03-vercel-setup.md)**
