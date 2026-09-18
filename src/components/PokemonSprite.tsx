import { useEffect, useState } from 'react'
import { displayName, fetchPokemon, type Pokemon } from '../lib/pokemon'

type Props = {
  /** PokeAPI slug, for example "houndoom". */
  name?: string
  shiny?: boolean
}

/**
 * Worked example of fetching a sprite from PokeAPI, and the seed of the shiny
 * showcase. Renders the Generation 5 Black/White animated GIF.
 *
 * The sprite is 77x72, so it is scaled up with `image-rendering: pixelated` to
 * keep the pixel art crisp rather than letting the browser smear it.
 */
export function PokemonSprite({ name = 'houndoom', shiny = true }: Props) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchPokemon(name, controller.signal)
      .then(setPokemon)
      .catch((err: unknown) => {
        // React's StrictMode runs effects twice in development, so the first
        // request gets aborted by the cleanup below. That is not a failure.
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
      })

    return () => controller.abort()
  }, [name])

  const src = shiny ? pokemon?.animatedShiny : pokemon?.animated

  return (
    <figure className="sprite">
      <div className="sprite-frame">
        {src ? (
          <img
            src={src}
            alt={`${displayName(name)}, ${shiny ? 'shiny' : 'regular'} coloration`}
            className="sprite-img"
          />
        ) : (
          <span className="sprite-placeholder" aria-hidden="true" />
        )}
      </div>
      <figcaption className="sprite-caption">
        {error ? (
          <>Could not reach PokeAPI: {error}</>
        ) : pokemon ? (
          <>
            {displayName(pokemon.name)} <span aria-hidden="true">&middot;</span>{' '}
            {shiny ? 'shiny' : 'regular'}{' '}
            <span aria-hidden="true">&middot;</span> no. {pokemon.id}
          </>
        ) : (
          <>Loading from PokeAPI&hellip;</>
        )}
      </figcaption>
    </figure>
  )
}
