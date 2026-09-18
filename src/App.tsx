import { PokemonSprite } from './components/PokemonSprite'
import { SupabaseStatus } from './components/SupabaseStatus'

export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>Team [CERB]</h1>
          <h3>Good luck Tank! You got this, ask me if you have any questions</h3>
          <p className="tagline">
            A guild homepage in the making. React + TypeScript on Vite, a
            Supabase back end, and automatic deploys through Vercel.
          </p>
        </div>
        <PokemonSprite name="houndoom" shiny />
      </section>

      <SupabaseStatus />

      <section className="next">
        <h2>Where to go next</h2>
        <ol>
          <li>
            <code>docs/01-coding-agent-setup.md</code>: install a coding
            agent so you have help with the rest.
          </li>
          <li>
            <code>docs/02-github-setup.md</code>: create the GitHub account
            and push this code.
          </li>
          <li>
            <code>docs/03-vercel-setup.md</code>: create the Vercel account
            and get the site online.
          </li>
          <li>
            <code>docs/04-supabase-setup.md</code>: create the Supabase
            project and its API keys.
          </li>
          <li>
            <code>docs/05-connect-everything.md</code>: wire the three
            together so every push deploys.
          </li>
          <li>
            <code>docs/06-deploying-supabase.md</code>: apply the database
            schema and edge functions.
          </li>
        </ol>
      </section>

      <footer className="footer">
        Handed over as-is. Start at <code>docs/00-start-here.md</code>.
      </footer>
    </main>
  )
}
