/**
 * PokeAPI access.
 *
 * PokeAPI needs no account, no key, and no proxy: it sends
 * `access-control-allow-origin: *` and a 24-hour `cache-control`, so calling it
 * straight from the browser is fine and the browser handles the caching.
 *
 * One caveat worth keeping in mind as this grows. A species payload is around
 * 30 KB, so this is the right shape for one feature sprite and the wrong shape
 * for a 40-member roster. For lists, store the slug and dex number on your own
 * rows and build the sprite URL from them, with no API call on the render path
 * at all. See docs/08-data-sources.md.
 */

const API = 'https://pokeapi.co/api/v2/pokemon'

/** Just the fields this site uses, pulled out of a much larger response. */
export type Pokemon = {
  id: number
  name: string
  /** Generation 5 Black/White animated GIF, 77x72-ish. Null for later species. */
  animated: string | null
  animatedShiny: string | null
  /** High-resolution still, for a large feature image. */
  artwork: string | null
}

export async function fetchPokemon(
  name: string,
  signal?: AbortSignal,
): Promise<Pokemon> {
  const res = await fetch(`${API}/${name.toLowerCase()}`, { signal })
  if (!res.ok) {
    throw new Error(`PokeAPI returned ${res.status} for "${name}"`)
  }

  const data = await res.json()

  // The animated sprites live several levels down, under the game version that
  // introduced them. Only generations 5 and earlier have animated ones, so
  // these are null for anything newer and the caller has to cope.
  const blackWhite = data.sprites?.versions?.['generation-v']?.['black-white']

  return {
    id: data.id,
    name: data.name,
    animated: blackWhite?.animated?.front_default ?? null,
    animatedShiny: blackWhite?.animated?.front_shiny ?? null,
    artwork: data.sprites?.other?.['official-artwork']?.front_default ?? null,
  }
}

/** Title-case a PokeAPI slug for display: "mr-mime" becomes "Mr Mime". */
export function displayName(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
