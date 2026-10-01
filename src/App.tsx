import { PokemonSprite } from './components/PokemonSprite'
// import { SupabaseStatus } from './components/SupabaseStatus'
export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>TEAM CERBERUS</h1>
          <h3>Welcome to Team Cerberus</h3>
          <p className="tagline">
            Team Cerberus is an up-and-coming PokeMMO community built around friendship, fun, and helping each other grow. Whether you're a veteran player, a dedicated shiny hunter, or just starting your journey, there's a place for you here.
          </p>
          <p className="tagline">
            We enjoy spending time together through shiny hunting, catch events, tournaments, and community activities, while always being willing to lend a hand to our fellow members and newcomers.
          </p>
          <p className="tagline">
            At the heart of our community is a dedicated group of shiny hunters working toward completing the Shiny Pokédex. We celebrate every new shiny, help each other with hunts, and enjoy the journey together — one encounter at a time.
          </p>
          <p className="tagline">
            We're not just here to build a strong team; we're here to build a community we actually enjoy being part of.
          </p>
        </div>
        <PokemonSprite name="houndoom" shiny />
      </section>

      <section className="next">
        <h2>Join Team Cerberus</h2>
        <p>Looking for a friendly and active PokeMMO community to call home?</p>
        <p>Join Team Cerberus and become part of the pack.</p>
        <p><a href="https://discord.com/invite/uk9BSbJ6xg" target="_blank" rel="noopener noreferrer">Join our Discord →</a></p>
      </section>

      <footer className="footer">
        Team Cerberus — PokeMMO Community · <a href="https://discord.com/invite/uk9BSbJ6xg" target="_blank" rel="noopener noreferrer">Join our Discord</a>
      </footer>
      
    </main >
  )
}
