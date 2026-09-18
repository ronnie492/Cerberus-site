# Start here

This repository is a working proof of concept for the Team Cerebus site. It is
handed over as-is, for free, with no support attached. Everything you need to
get it online is in this folder.

**Where this is heading:** a guild homepage for a Pokémon MMO, with a team
roster, an admin login for maintaining it, a shiny showcase for members' rare
catches, and possibly a Discord integration later. None of that is built. What
exists is the foundation those features will sit on, plus the instructions for
getting it live.

## What you have been given

A React website written in TypeScript, built with Vite. It has one page that
says "Team Cerebus" and a status box that tells you whether the database is
connected. It also contains an example database table and an example server
function, ready to deploy but not yet deployed anywhere.

Three outside services make it run. All three have free tiers that are
sufficient for a site this size:

| Service  | What it does for you                                     | Cost to start |
| -------- | -------------------------------------------------------- | ------------- |
| GitHub   | Stores the code and its history                          | Free          |
| Vercel   | Turns the code into a live website, automatically        | Free          |
| Supabase | Database, user accounts, and small server functions      | Free          |

## Read these in order

Do not skip ahead. Each guide assumes you finished the one before it.

1. **[01-coding-agent-setup.md](01-coding-agent-setup.md)** Install a coding
   agent. Do this first, because it can do most of the remaining work for you
   and can read these same instructions.
2. **[02-github-setup.md](02-github-setup.md)** Create a GitHub account and put
   this code in a repository.
3. **[03-vercel-setup.md](03-vercel-setup.md)** Create a Vercel account and
   publish the site.
4. **[04-supabase-setup.md](04-supabase-setup.md)** Create a Supabase project
   and collect its two keys.
5. **[05-connect-everything.md](05-connect-everything.md)** Wire the three
   services together so that every push to GitHub updates the live site.
6. **[06-deploying-supabase.md](06-deploying-supabase.md)** Apply the database
   schema and deploy the example server function. Written for whoever picks
   this up next, whether that is a person or a coding agent.

Two more, for whoever builds on it rather than sets it up:

7. **[07-agent-runbook.md](07-agent-runbook.md)** Provisioning and operating
   the whole stack from the command line. Written for the coding agent that
   ends up maintaining this, including how to diagnose a vague complaint.
8. **[08-data-sources.md](08-data-sources.md)** The Pokémon APIs and sprite
   sources the guild features will need, with the naming traps marked.

If you would rather hand the whole setup to your coding agent, point it at
guide 7 and skip to the end. It can do guides 2 through 6 from the command
line without you opening a single dashboard, apart from four logins that need
your browser.

> **A note on the order.** The original request listed Vercel before GitHub.
> They are swapped here for a practical reason: Vercel builds your site *from*
> a GitHub repository, so the repository has to exist first. Everything else
> follows the order you asked for.

## Time and difficulty

Roughly 60 to 90 minutes end to end if you have never used any of these
services. About 20 minutes if you have. None of it requires writing code.

## Before you start, you will need

- A computer running macOS, Windows, or Linux.
- An email address you can receive mail at, for the three sign-ups.
- A phone, for the two-factor authentication that GitHub requires.
- About 1 GB of free disk space.

## Conventions used in these guides

- Text in `this style` is something to type or click exactly as written.
- Lines beginning with `$` are commands for a terminal. Type everything after
  the `$`, not the `$` itself.
- **"You should see"** blocks tell you what success looks like. If you see
  something different, the **Troubleshooting** section at the end of each guide
  is the place to look.
- These services redesign their websites regularly. If a button has been
  renamed since this was written, look for something with a similar meaning
  rather than assuming you are in the wrong place.

## What is deliberately not done

Being honest about the edges of this proof of concept:

- No custom domain. The site will live at a `vercel.app` address until you buy
  and connect a domain.
- No tests, no error tracking, no analytics.
- No user login. Supabase can do it; nothing here uses it yet.
- One example table with public read access, intended to prove the connection
  works rather than to model anything real.
- None of the guild features: no roster, no showcase, no Discord.
- CI runs a build and type-check on every push, but there are no tests for it
  to run.

Good luck.
