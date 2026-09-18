# 1. Install a coding agent

**Goal:** have an AI coding agent running in a terminal window, sitting in this
project's folder, able to read and change the code.

**Why first:** the agent can do nearly everything in guides 2 through 6 for
you. You can literally paste a sentence like "read docs/02-github-setup.md and
do it" and let it work. It is also the thing that will maintain this site after
the handover.

**Time:** 10 to 15 minutes.

---

## Step 1: Open a terminal

You will need one for every guide that follows, so get comfortable with it now.

- **macOS:** press `Cmd` + `Space`, type `Terminal`, press `Return`.
- **Windows:** press the Start key, type `Terminal`, press `Enter`. (On Windows
  10, `PowerShell` instead.)
- **Linux:** `Ctrl` + `Alt` + `T` on most desktops.

A window opens with a blinking cursor. That is the terminal. You type a command,
press `Return`, and it does something.

> **You should see** a line ending in `%` or `$` followed by a cursor. The text
> before it is your username and computer name. That is normal.

## Step 2: Install Node.js

Node.js runs JavaScript outside a browser. This project needs version 20.19 or
newer. Check whether you already have it:

```
$ node --version
```

> **You should see** something like `v22.14.0`. If the first number is 20 or
> higher, skip to Step 3.

If you see `command not found`, or a version lower than 20:

1. Go to **<https://nodejs.org>**.
2. Download the version labeled **LTS** (Long Term Support). The site will
   offer the right installer for your operating system.
3. Open the downloaded file and click through the installer, accepting the
   defaults.
4. **Close the terminal window completely and open a new one.** The installer
   only affects terminals opened after it finishes. This trips up almost
   everyone.
5. Run `node --version` again.

## Step 3: Install Claude Code

Claude Code is the agent these instructions are written for. Run:

```
$ npm install -g @anthropic-ai/claude-code
```

This takes a minute or two and prints a lot of text. Then confirm it worked:

```
$ claude --version
```

> **You should see** a version number, for example `2.1.4`.

If that command fails with a permissions error on macOS or Linux, use the
standalone installer instead, which does not need administrator rights:

```
$ curl -fsSL https://claude.ai/install.sh | bash
```

On Windows PowerShell, the equivalent is:

```
$ irm https://claude.ai/install.ps1 | iex
```

## Step 4: Point the agent at this project

The agent works inside whatever folder you start it in, so you have to move
there first. `cd` means "change directory".

```
$ cd "/path/to/cerebus-site-poc"
```

Replace the path with the real location of this folder. The reliable trick:
type `cd ` (with a trailing space), then drag the project folder from Finder or
File Explorer into the terminal window. The path fills itself in. Press
`Return`.

Confirm you are in the right place:

```
$ ls
```

> **You should see** a list including `docs`, `src`, `package.json`, and
> `supabase`. If you do not, you are in the wrong folder. Try the drag trick
> again.

Now start the agent:

```
$ claude
```

## Step 5: Sign in

Claude Code opens a browser window and asks you to log in or create an
Anthropic account. Follow the prompts there, then return to the terminal.

Using Claude Code requires either a paid Claude subscription or API credits.
There is no free tier. If you would rather not pay for this one, see
**Alternatives** below.

> **You should see** a prompt in the terminal waiting for you to type.

## Step 6: Prove it works

Type this and press `Return`:

```
Read docs/00-start-here.md and tell me in two sentences what this project is.
```

> **You should see** it read the file and answer. The agent is now working.

Useful things to know while you are in it:

- `Esc` interrupts the agent mid-task.
- Typing `/help` lists the available commands.
- `Ctrl` + `C` twice, or typing `/exit`, quits.
- It asks permission before changing files or running commands. Read those
  prompts rather than approving them reflexively.

## Step 7: Install the project's dependencies

While you have a terminal open, get the project runnable. Quit the agent (or
open a second terminal tab) and run:

```
$ npm install
$ npm run dev
```

> **You should see** a message with a local address, usually
> `http://localhost:5173/`. Open that in a browser. You should get a page
> reading **Team Cerebus** with an orange dot saying Supabase is not
> configured. That warning is correct at this stage; guide 4 fixes it.

Press `Ctrl` + `C` in the terminal to stop the server when you are done.

---

## Alternatives

If Claude Code does not suit you, any of these will read the same Markdown
instructions. The rest of these guides assume Claude Code, but nothing depends
on it.

- **GitHub Copilot** in VS Code. Cheapest option, and it has a free tier with
  monthly limits.
- **Cursor** (<https://cursor.com>), a standalone code editor with an agent
  built in. The most approachable if you dislike terminals.
- **Gemini CLI** or **OpenAI Codex CLI**, both similar in shape to Claude Code.

---

## Troubleshooting

**`npm: command not found`**
Node.js is not installed, or the terminal predates the install. Redo Step 2,
paying attention to closing and reopening the terminal.

**`EACCES: permission denied` during `npm install -g`**
npm is trying to write to a protected folder. Use the standalone installer from
Step 3. Avoid `sudo npm install -g`, which causes worse problems later.

**`claude: command not found` right after a successful install**
The install folder is not on your `PATH`. Close and reopen the terminal. If it
still fails, run `npm config get prefix`, then add `/bin` to the end of the
result and add that folder to your `PATH`. Your agent can do this for you if
you can get it running another way.

**The terminal shows a path with spaces and the `cd` fails**
Wrap the path in double quotes: `cd "/Users/you/For Fun/cerebus-site-poc"`.

**`npm install` fails with network or certificate errors**
Usually a corporate VPN or proxy. Try off the VPN.

---

Next: **[02-github-setup.md](02-github-setup.md)**
