# 8. External data sources and tooling tips

**What this site is meant to become:** a guild homepage for a Pokémon MMO, with
a team roster, an admin login for maintaining it, a "shiny showcase" for
members' rare catches, and possibly a Discord integration later. None of that
is built yet. This guide covers the outside data you will want when you do
build it, with the URLs checked and the traps marked.

---

## PokeAPI: species data

<https://pokeapi.co>

A free, read-only REST API for Pokémon species, moves, types, and abilities.
No account, no key, no signup.

```
$ curl https://pokeapi.co/api/v2/pokemon/ditto
```

What is true of it, verified rather than assumed:

| Property          | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Authentication    | None                                                   |
| CORS              | `access-control-allow-origin: *`, so browsers can call it directly |
| Caching           | Serves `cache-control: public, max-age=86400`           |
| Response size     | About 29 KB for `ditto`, and it is one of the simpler ones |
| Methods           | GET only                                               |

Accepts either a name or a dex number, so `/pokemon/ditto` and `/pokemon/132`
are the same resource. List endpoints paginate with `?limit=` and `?offset=`.

### Practical notes

**The responses are large and mostly not what you want.** A single species
payload includes every move it can learn across every generation. For a roster
row you need maybe five fields out of several hundred. Pull what you need and
discard the rest rather than storing whole payloads.

**It has no rate limit but asks you to cache.** Honor that. The failure mode to
avoid is a page that renders a 40-member roster by making 40 API calls on every
load. Two ways out, and you will probably want both:

- Store the dex number or slug on your own rows, and derive sprite URLs at
  render time. No API call at all for the common case.
- For species data you genuinely need, fetch once into a Supabase table and
  read from there. An edge function on a cron schedule is the natural home for
  the refresh, and it doubles as the keep-alive described in
  [06-deploying-supabase.md](06-deploying-supabase.md).

**Sprite URLs come back inside the payload**, pointing at GitHub:

```
sprites.front_default
  https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png

sprites.other["official-artwork"].front_default
  https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/132.png
```

The official artwork is the high-resolution one, and it is the right choice for
a feature image on a showcase entry.

### Animated sprites (what the homepage uses)

Generation 5 shipped animated sprites, and they are the best-looking option for
a guild page. They sit further down the payload, under the game version that
introduced them:

```
sprites.versions["generation-v"]["black-white"].animated.front_default
sprites.versions["generation-v"]["black-white"].animated.front_shiny
```

which resolve to GIFs like:

```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/229.gif
```

That one is shiny Houndoom, and it is what `src/components/PokemonSprite.tsx`
renders. `src/lib/pokemon.ts` is the fetch, and between them they are the
working example to copy for the showcase.

Three things to know before leaning on these:

- **They stop at generation 5.** Anything introduced later has `animated` as
  `null`, so always have a fallback. The component treats a missing sprite as a
  loading placeholder rather than crashing.
- **They are small**, around 77x72 pixels. Scale them up with
  `image-rendering: pixelated`, or the browser blurs the pixel art.
- The animated set also has `back_*`, `front_female`, and
  `front_shiny_female` variants where a species has them.

There is also a GraphQL endpoint if you would rather request exactly the fields
you need. Check the current URL and schema on the PokeAPI docs site before
relying on it; it has moved between versions.

---

## PokeSprite: icon sprites

<https://msikma.github.io/pokesprite/index.html>

A repository of small box-style sprites: every species in regular and shiny,
plus item icons. The index page above is a searchable gallery of everything in
it. This is the better source for anything list-shaped, and it is the one that
makes a shiny showcase easy, because shiny variants are first-class rather than
an afterthought.

### Getting the images

The paths are stable and predictable, and all of these return 200 today:

```
pokemon-gen8/regular/ditto.png
pokemon-gen8/shiny/ditto.png
pokemon-gen8/shiny/gyarados.png
pokemon-gen8/shiny/female/pikachu.png
items/ball/master.png
data/pokemon.json
```

Serve them over jsDelivr rather than committing the repository:

```
https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/shiny/gyarados.png
```

Pin a tag instead of `@master` once the site matters, so an upstream change
cannot alter your images without warning.

If you would rather have the files locally, there is an npm package:

```
$ npm install pokesprite-images
```

### `data/pokemon.json` is the mapping you will need

It is an object keyed by dex number as a string, and each entry carries names
and slugs per language plus per-generation form metadata:

```json
"132": {
  "idx": "132",
  "name": { "eng": "Ditto", "jpn": "メタモン", "jpn_ro": "Metamon" },
  "slug": { "eng": "ditto", "jpn": "metamon" },
  "gen-8": { "forms": { "$": { "is_prev_gen_icon": true } } }
}
```

905 entries as of this writing.

**Use this file as the source of truth for slugs.** PokeAPI and PokeSprite
mostly agree on naming, but not always, and the disagreements cluster exactly
where you would expect: gendered forms, regional variants, punctuated names
like Mr. Mime and Farfetch'd, and anything with multiple forms. Guessing a slug
by lowercasing a display name works until it does not, and then it produces a
broken image rather than an error. Resolve through the mapping, and fall back
to a placeholder when a lookup misses.

### A helper worth writing once

```ts
const CDN = 'https://cdn.jsdelivr.net/gh/msikma/pokesprite@master'

/** Box sprite for a roster row or a showcase thumbnail. */
export function spriteUrl(slug: string, shiny = false, female = false) {
  const variant = shiny ? 'shiny' : 'regular'
  const sex = female ? 'female/' : ''
  return `${CDN}/pokemon-gen8/${variant}/${sex}${slug}.png`
}

/** High-resolution artwork, for the hero image on a showcase entry. */
export function artworkUrl(dexNumber: number) {
  return (
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon' +
    `/other/official-artwork/${dexNumber}.png`
  )
}
```

Store `slug`, `dex_number`, and `is_shiny` on your own rows and both URLs fall
out of them. That is the whole integration for most of this site: no API calls
on the render path, nothing to cache, nothing to go stale.

---

## Which source for which job

| Need                              | Use                                       |
| --------------------------------- | ----------------------------------------- |
| Roster list, many small rows      | PokeSprite `pokemon-gen8/regular`          |
| Shiny showcase thumbnails         | PokeSprite `pokemon-gen8/shiny`            |
| Animated sprite, up to gen 5      | PokeAPI `generation-v/black-white/animated` |
| One large feature image           | PokeAPI official artwork                   |
| Types, stats, abilities, moves    | PokeAPI, cached into Supabase              |
| Item icons (balls, held items)    | PokeSprite `items/`                        |
| Name and slug resolution          | PokeSprite `data/pokemon.json`             |

---

## The data neither source has

Both of these describe Pokémon in general. Neither knows anything about your
guild, your members, or what they caught in the MMO. Assume the game itself has
no public API until someone proves otherwise, which means roster and shiny data
gets entered by hand.

That is the reason the site needs an admin login, and it is worth designing
around deliberately rather than discovering later. A likely shape, not
implemented and offered only as a starting point:

```sql
-- members of the guild
create table public.members (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  joined_at     date,
  is_active     boolean not null default true
);

-- a shiny someone caught
create table public.shiny_catches (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete cascade,
  slug        text not null,          -- resolved via pokesprite data/pokemon.json
  dex_number  integer not null,
  caught_at   date,
  note        text,
  created_at  timestamptz not null default now()
);
```

The row level security pattern that fits the stated features: **public read,
authenticated write.** Visitors see the roster and the showcase without logging
in; admins sign in through Supabase Auth and are the only ones who can change
anything.

```sql
alter table public.shiny_catches enable row level security;

create policy "anyone can read the showcase"
  on public.shiny_catches for select to anon, authenticated using (true);

create policy "signed-in admins can add to it"
  on public.shiny_catches for insert to authenticated with check (true);
```

That `with check (true)` grants any signed-in user write access, which is only
acceptable while the only accounts that exist are admin accounts. The moment
members can sign up, it has to become a real check against a role column or an
admin allowlist. Write that down in the migration when you get there, because
it is the kind of thing that quietly stops being true.

Supabase Auth is already available on the project; nothing in this repo uses it
yet. Email plus password is the least friction for a handful of admins. Discord
OAuth is also a provider, which may be attractive given the audience.

---

## Discord, if it happens

The scope is undecided, so this is only about where it would live.

**Site posts to Discord** (a new shiny appears in a channel). This is the easy
direction: a channel webhook URL, and an HTTPS POST from an edge function.
Store the webhook URL as a Supabase secret, never as a `VITE_` variable, since
anyone holding it can post to the channel as you.

```
$ npx supabase secrets set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Discord posts to the site** (a bot command that reads the roster). This is
the harder direction and needs a real application: a registered Discord app,
verification of their signature on every request, and a response inside their
three-second timeout. An edge function can do it. Deploy it `--no-verify-jwt`,
because Discord will not send a Supabase authorization header, and verify the
Discord signature yourself instead. The webhook receiver in
[06-deploying-supabase.md](06-deploying-supabase.md) is the same shape and is
the place to start from.

---

## Licensing, briefly and honestly

Pokémon names, sprites, and artwork are Nintendo, Creatures, and Game Freak
intellectual property. PokeAPI and PokeSprite are fan projects that redistribute
it; neither can grant you rights it does not have. Fan sites like this one are
tolerated in practice and get asked to stop when they start looking commercial.

Practically: keep it non-commercial, which is what the Vercel Hobby plan
requires of you anyway, and do not put advertising on it. If the guild ever
wants to sell something, that is the point to get a real answer rather than
inheriting this assumption.

---

## Reference

- PokeAPI docs: <https://pokeapi.co/docs/v2>
- PokeAPI fair use: <https://pokeapi.co/docs/v2#fairuse>
- PokeSprite gallery: <https://msikma.github.io/pokesprite/index.html>
- PokeSprite repository: <https://github.com/msikma/pokesprite>
- Supabase Auth: <https://supabase.com/docs/guides/auth>
- Discord webhooks: <https://discord.com/developers/docs/resources/webhook>
