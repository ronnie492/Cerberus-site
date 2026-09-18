import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Status =
  | { kind: 'checking' }
  | { kind: 'unconfigured' }
  | { kind: 'connected'; rowCount: number }
  | { kind: 'no-table' }
  | { kind: 'error'; message: string }

/**
 * Proof-of-concept health check for the Supabase wiring.
 *
 * It reads the example `messages` table created by
 * supabase/migrations/0001_init.sql. The three interesting outcomes are all
 * shown distinctly so whoever picks this up can tell *which* step is missing:
 * env vars, the migration, or the RLS policy.
 */
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>(
    supabase ? { kind: 'checking' } : { kind: 'unconfigured' },
  )

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase
      .from('messages')
      .select('id')
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          // PGRST205 is PostgREST's "table not found in schema cache", which
          // is what you get on a live project before the migration is applied.
          const tableMissing =
            error.code === 'PGRST205' || error.code === '42P01'
          setStatus(
            tableMissing
              ? { kind: 'no-table' }
              : { kind: 'error', message: error.message },
          )
          return
        }

        setStatus({ kind: 'connected', rowCount: data?.length ?? 0 })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="status" data-kind={status.kind}>
      <span className="status-dot" aria-hidden="true" />
      <div className="status-text">{describe(status)}</div>
    </div>
  )
}

function describe(status: Status) {
  switch (status.kind) {
    case 'checking':
      return <>Checking Supabase connection&hellip;</>

    case 'unconfigured':
      return (
        <>
          <strong>Supabase not configured.</strong> Add{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
          to <code>.env.local</code> (see <code>docs/04-supabase-setup.md</code>
          ).
        </>
      )

    case 'connected':
      return (
        <>
          <strong>Supabase connected.</strong> Read {status.rowCount}{' '}
          {status.rowCount === 1 ? 'row' : 'rows'} from the{' '}
          <code>messages</code> table.
        </>
      )

    case 'no-table':
      return (
        <>
          <strong>Supabase reachable, schema not applied.</strong> Run the
          migration in <code>supabase/migrations/</code> (see{' '}
          <code>docs/06-deploying-supabase.md</code>).
        </>
      )

    case 'error':
      return (
        <>
          <strong>Supabase error:</strong> {status.message}
        </>
      )
  }
}
