#!/usr/bin/env node
/**
 * Full-stack deploy, in the order that cannot break the live site.
 *
 *   npm run deploy              interactive; prompts before touching the database
 *   npm run deploy -- --yes     unattended; use this from a bot or a script
 *   npm run deploy -- --dry-run show the plan and the pending migrations, change nothing
 *
 * Other flags: --skip-db, --skip-functions, --skip-web, --allow-dirty
 *
 * Order matters. Migrations go first, so the front end never ships against a
 * database that lacks the table it expects. The web push happens last because
 * it is the step visitors see.
 *
 * Node rather than bash so it behaves the same on macOS, Linux, and Windows.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ESC = String.fromCharCode(27)
const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (c, s) => (useColor ? `${ESC}[${c}m${s}${ESC}[0m` : s)
const bold = (s) => paint('1', s)

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opts = {
  yes: flag('yes'),
  dryRun: flag('dry-run'),
  skipDb: flag('skip-db'),
  skipFunctions: flag('skip-functions'),
  skipWeb: flag('skip-web'),
  allowDirty: flag('allow-dirty'),
}

const root = process.cwd()
let step = 0

function heading(text) {
  step += 1
  console.log(`\n${bold(`[${step}] ${text}`)}`)
}

function die(message, hint) {
  console.error(`\n${paint('31', 'Deploy stopped.')} ${message}`)
  if (hint) console.error(`\n  ${hint}`)
  console.error('')
  process.exit(1)
}

/** Run a command with its output streamed through. Dies on failure. */
function must(cmd, args, { hint } = {}) {
  console.log(paint('90', `    $ ${cmd} ${args.join(' ')}`))
  if (opts.dryRun) {
    console.log(paint('90', '      (dry run, not executed)'))
    return
  }
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) die(`\`${cmd} ${args.join(' ')}\` exited ${r.status}.`, hint)
}

/** Run a command quietly and return its output. */
function capture(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

const sb = (args) => must('npx', ['supabase', ...args])

// ------------------------------------------------------------------ preflight

heading('Preflight')

if (!capture('git', ['rev-parse', '--is-inside-work-tree']).ok) {
  die(
    'This folder is not a git repository, so there is nothing to deploy from.',
    'See docs/02-github-setup.md, or run: npm run doctor',
  )
}

const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out
const dirty = capture('git', ['status', '--porcelain']).out

if (branch !== 'main' && !opts.yes) {
  die(
    `You are on branch \`${branch}\`, not \`main\`.`,
    'Pushing this branch will not update the production site, but a database ' +
      'migration would still hit the production database. Switch to main, or ' +
      're-run with --yes if that is genuinely what you want.',
  )
}

if (dirty && !opts.allowDirty) {
  console.log(paint('33', '    Uncommitted changes:'))
  console.log(
    dirty
      .split('\n')
      .map((l) => `      ${l}`)
      .join('\n'),
  )
  die(
    'The working tree is not clean, and uncommitted work never reaches the live site.',
    'Commit it first:\n' +
      '    git add . && git commit -m "Describe what changed"\n' +
      '  Then run this again. Use --allow-dirty only if you deliberately want ' +
      'to deploy the database without committing the code.',
  )
}

console.log(`    branch ${branch}, working tree ${dirty ? 'dirty' : 'clean'}`)

// --------------------------------------------------------------- quality gate

heading('Check the code compiles')

must('npm', ['run', 'lint'], { hint: 'Fix the lint errors above, then re-run.' })
must('npm', ['run', 'build'], {
  hint:
    'The build type-checks before it bundles, so this is the same failure ' +
    'Vercel would hit. Fix it locally rather than pushing it.',
})

// -------------------------------------------------------------- the database

const migrationsDir = join(root, 'supabase', 'migrations')
const migrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
  : []

if (opts.skipDb || migrations.length === 0) {
  heading('Database migrations')
  console.log(
    `    skipped (${opts.skipDb ? '--skip-db' : 'no migration files found'})`,
  )
} else {
  heading(`Database migrations (${migrations.length} file(s) locally)`)

  const linked = existsSync(join(root, 'supabase', '.temp', 'project-ref'))
  if (!linked && !opts.dryRun) {
    die(
      'No Supabase project is linked to this checkout.',
      'Run: npx supabase link --project-ref <ref>\n' +
        '  Find the ref with: npx supabase projects list',
    )
  }
  if (!linked) {
    console.log(
      paint('33', '    not linked to a project, so the real push would stop here'),
    )
  }

  // Always show what would change before changing it. This output is the thing
  // worth pasting back to whoever asked for the deploy.
  console.log(paint('90', '    Pending migrations:'))
  must('npx', ['supabase', 'db', 'push', '--dry-run'])

  if (opts.dryRun) {
    console.log(paint('90', '    (dry run, stopping before the real push)'))
  } else if (opts.yes) {
    sb(['db', 'push', '--yes'])
  } else if (process.stdin.isTTY) {
    sb(['db', 'push'])
  } else {
    die(
      'Applying migrations needs a confirmation, and there is no terminal here to ask.',
      'Review the dry-run output above, then re-run with: npm run deploy -- --yes',
    )
  }
}

// -------------------------------------------------------------- edge functions

const functionsDir = join(root, 'supabase', 'functions')
const functions = existsSync(functionsDir)
  ? readdirSync(functionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
  : []

heading('Edge functions')
if (opts.skipFunctions || functions.length === 0) {
  console.log(
    `    skipped (${
      opts.skipFunctions ? '--skip-functions' : 'no functions found'
    })`,
  )
} else {
  console.log(`    deploying: ${functions.join(', ')}`)
  sb(['functions', 'deploy'])
}

// ------------------------------------------------------------------- the web

heading('Front end')
if (opts.skipWeb) {
  console.log('    skipped (--skip-web)')
} else {
  const ahead = capture('git', ['rev-list', '--count', '@{u}..HEAD'])
  const pending = ahead.ok ? Number(ahead.out) : null

  if (pending === 0) {
    console.log('    nothing to push; origin already has this commit')
    console.log(
      paint(
        '90',
        '    If the live site is stale anyway, the last Vercel build failed. ' +
          'Check: vercel ls',
      ),
    )
  } else {
    console.log(
      `    pushing${pending ? ` ${pending} commit(s)` : ''} to origin/${branch}`,
    )
    must('git', ['push'], {
      hint: 'Run `npm run doctor` to check the remote and your GitHub auth.',
    })
    console.log(
      '\n    Vercel builds from that push automatically. Watch it with:\n' +
        '      vercel ls        (most recent deployments and their status)\n' +
        '      vercel logs <url>  (build and runtime output for one of them)',
    )
  }
}

// ---------------------------------------------------------------------- done

console.log(`\n${bold(opts.dryRun ? 'Dry run complete.' : 'Deploy complete.')}`)
console.log(
  '\n  Verify it for real, rather than assuming:\n' +
    '    npm run doctor        every part of the stack, including the live database\n' +
    '    open the .vercel.app URL and confirm the status dot is green\n',
)
