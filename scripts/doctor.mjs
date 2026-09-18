#!/usr/bin/env node
/**
 * Stack health check. Run this first whenever something is reported broken.
 *
 *   npm run doctor
 *
 * It inspects every moving part (local toolchain, git, GitHub, Vercel,
 * Supabase) and prints one line per check plus a list of next actions. It only
 * reads. Nothing here deploys or changes anything, so it is always safe to run.
 *
 * Written in Node rather than bash so it behaves the same on macOS, Linux, and
 * Windows, and needs nothing installed beyond this repo's own dependencies.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ESC = String.fromCharCode(27)
const root = process.cwd()
const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (c, s) => (useColor ? `${ESC}[${c}m${s}${ESC}[0m` : s)

const MARK = {
  ok: paint('32', 'ok  '),
  warn: paint('33', 'warn'),
  fail: paint('31', 'FAIL'),
  skip: paint('90', 'skip'),
}

const results = []
const actions = []

function check(label, status, detail, action) {
  results.push({ label, status, detail })
  if (action && (status === 'fail' || status === 'warn')) actions.push(action)
}

/** Run a command, capture its output, never throw. */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: opts.timeout ?? 20000,
    ...opts,
  })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

/** Minimal .env parser, to avoid a dependency for four lines of work. */
function readEnvFile(path) {
  if (!existsSync(path)) return null
  const vars = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) vars[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return vars
}

async function probe(url, headers) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    return { status: res.status, body: (await res.text()).slice(0, 300) }
  } catch (err) {
    return { status: 0, body: err.message }
  }
}

// ----------------------------------------------------------------- toolchain

const [major, minor] = process.versions.node.split('.').map(Number)
const nodeOk = major > 20 || (major === 20 && minor >= 19)
check(
  'Node.js version',
  nodeOk ? 'ok' : 'fail',
  `v${process.versions.node}`,
  'Install Node.js 20.19 or newer from https://nodejs.org',
)

const hasModules = existsSync(join(root, 'node_modules'))
check(
  'Dependencies installed',
  hasModules ? 'ok' : 'fail',
  hasModules ? 'node_modules present' : 'node_modules missing',
  'Run: npm install',
)

// -------------------------------------------------------------- env variables

const env = readEnvFile(join(root, '.env.local'))
const url = env?.VITE_SUPABASE_URL
const anonKey = env?.VITE_SUPABASE_ANON_KEY

if (!env) {
  check(
    'Local env file',
    'fail',
    '.env.local not found',
    'Run: cp .env.example .env.local, then fill in the two Supabase values ' +
      '(docs/04-supabase-setup.md)',
  )
} else if (!url || !anonKey) {
  check(
    'Local env file',
    'fail',
    `missing ${!url ? 'VITE_SUPABASE_URL' : 'VITE_SUPABASE_ANON_KEY'}`,
    'Add the missing variable to .env.local (docs/04-supabase-setup.md)',
  )
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  check(
    'Local env file',
    'fail',
    `VITE_SUPABASE_URL looks malformed`,
    'VITE_SUPABASE_URL must be https://<project-ref>.supabase.co exactly: no ' +
      'trailing slash, no path',
  )
} else {
  check('Local env file', 'ok', `${url}, key of ${anonKey.length} chars`)
}

// ------------------------------------------------------------ the supabase api

if (url && anonKey) {
  const rest = await probe(`${url}/rest/v1/`, { apikey: anonKey })

  if (rest.status === 0) {
    check(
      'Supabase API',
      'fail',
      `no response (${rest.body})`,
      'Most likely the project is paused: open https://supabase.com/dashboard, ' +
        'select the project, click Restore. See also docs/06-deploying-supabase.md, ' +
        '"keep the project awake with a webhook".',
    )
  } else if (rest.status === 401) {
    check(
      'Supabase API',
      'fail',
      '401 unauthorized',
      'The anon key is wrong or truncated. Re-fetch it with: ' +
        'npx supabase projects api-keys --project-ref <ref>',
    )
  } else if (rest.status >= 500) {
    check(
      'Supabase API',
      'fail',
      `HTTP ${rest.status}`,
      'The project is paused or unhealthy. Check https://supabase.com/dashboard ' +
        'and https://status.supabase.com',
    )
  } else {
    check('Supabase API', 'ok', `HTTP ${rest.status}`)

    const table = await probe(`${url}/rest/v1/messages?select=id&limit=1`, {
      apikey: anonKey,
    })
    if (table.status === 200) {
      check('Supabase schema', 'ok', 'messages table readable')
    } else if (table.status === 404 || table.body.includes('PGRST205')) {
      check(
        'Supabase schema',
        'fail',
        'messages table not found',
        'Run: npm run deploy:db   (see docs/06-deploying-supabase.md)',
      )
    } else {
      check(
        'Supabase schema',
        'warn',
        `HTTP ${table.status}: ${table.body}`,
        'The table exists but is not readable, which points at a row level ' +
          'security policy. Check Authentication > Policies in the dashboard.',
      )
    }
  }
} else {
  check('Supabase API', 'skip', 'no credentials to test with')
}

// ------------------------------------------------------------------------ git

if (!run('git', ['rev-parse', '--is-inside-work-tree']).ok) {
  check(
    'Git repository',
    'fail',
    'this folder is not a git repository',
    'Run: git init && git add . && git commit -m "Initial commit" ' +
      '(docs/02-github-setup.md)',
  )
} else {
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out
  const remote = run('git', ['remote', 'get-url', 'origin'])
  const dirty = run('git', ['status', '--porcelain']).out
  const ahead = run('git', ['rev-list', '--count', '@{u}..HEAD'])

  check('Git repository', 'ok', `on branch ${branch}`)
  check(
    'Git remote',
    remote.ok ? 'ok' : 'fail',
    remote.ok ? remote.out : 'no origin remote',
    'Run: gh repo create cerebus-site --private --source=. ' +
      '--remote=origin --push',
  )
  check(
    'Working tree',
    dirty ? 'warn' : 'ok',
    dirty ? `${dirty.split('\n').length} uncommitted file(s)` : 'clean',
    'Uncommitted work is never deployed. Commit it, then run npm run deploy.',
  )
  if (ahead.ok) {
    const n = Number(ahead.out)
    check(
      'Pushed to origin',
      n > 0 ? 'warn' : 'ok',
      n > 0 ? `${n} commit(s) not pushed` : 'up to date with origin',
      'Run: git push   (pushing is what triggers a deploy)',
    )
  }
}

// ------------------------------------------------------------------- the CLIs

const ghAuth = run('gh', ['auth', 'status'])
check(
  'GitHub CLI',
  ghAuth.ok ? 'ok' : 'warn',
  ghAuth.ok ? 'installed and authenticated' : 'not installed or not logged in',
  'Install gh from https://cli.github.com, then run: gh auth login',
)

if (ghAuth.ok) {
  const secrets = run('gh', ['secret', 'list'])
  const needed = [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_PROJECT_REF',
  ]
  const missing = needed.filter((n) => !secrets.out.includes(n))
  check(
    'CI secrets',
    missing.length ? 'warn' : 'ok',
    missing.length ? `missing: ${missing.join(', ')}` : 'all three set',
    'CI will skip database deploys until these exist. See ' +
      'docs/07-agent-runbook.md, "Wire up the pipeline".',
  )
}

const vercelWho = run('vercel', ['whoami'])
check(
  'Vercel CLI',
  vercelWho.ok ? 'ok' : 'warn',
  vercelWho.ok
    ? `logged in as ${vercelWho.out.split('\n').pop()}`
    : 'not installed or not logged in',
  'Run: npm i -g vercel && vercel login',
)

const vercelLinked = existsSync(join(root, '.vercel', 'project.json'))
check(
  'Vercel project link',
  vercelLinked ? 'ok' : 'warn',
  vercelLinked ? '.vercel/project.json present' : 'not linked in this checkout',
  'Run: vercel link --yes   (needed for vercel env and CLI deploys)',
)

const sbVersion = run('npx', ['--no-install', 'supabase', '--version'])
check(
  'Supabase CLI',
  sbVersion.ok ? 'ok' : 'warn',
  sbVersion.ok ? `v${sbVersion.out.split('\n').pop()}` : 'not installed',
  'Run: npm install --save-dev supabase',
)

const refFile = join(root, 'supabase', '.temp', 'project-ref')
const sbLinked = existsSync(refFile)
check(
  'Supabase project link',
  sbLinked ? 'ok' : 'warn',
  sbLinked ? readFileSync(refFile, 'utf8').trim() : 'not linked in this checkout',
  'Run: npx supabase link --project-ref <ref>   (required before db push)',
)

// --------------------------------------------------------------------- report

const pad = Math.max(...results.map((r) => r.label.length))
console.log('\n  Team Cerebus stack check\n')
for (const r of results) {
  console.log(`  ${MARK[r.status]}  ${r.label.padEnd(pad)}  ${r.detail}`)
}

const failed = results.filter((r) => r.status === 'fail').length
const warned = results.filter((r) => r.status === 'warn').length
const healthy = results.filter((r) => r.status === 'ok').length

if (actions.length) {
  console.log('\n  Next actions\n')
  actions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`))
}

console.log(`\n  ${failed} failing, ${warned} warning, ${healthy} healthy\n`)
process.exit(failed > 0 ? 1 : 0)
