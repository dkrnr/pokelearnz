# Buddy data and sprite sourcing

The sole identity/sprite boundary is `buddy.js`. The scene asks it for IDs, display names, types, greeting, personality, image and search results. Replacing that module and its catalog can replace the character collection without changing the scene controller.

Catalog: 1,025 default Pokémon, IDs 1–1025, from PokeAPI's `pokemon.csv`, `pokemon_types.csv` and `types.csv`, accessed at `cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/`. The local JSON is about 53 KB and holds only public ID/name/type data. This avoids one API call per tile and makes the complete search available offline. Personalities are the unchanged repository file used by main, read through the module.

Options evaluated:

| Option | Decision |
| --- | --- |
| Raw GitHub image URLs from main | Rejected: user explicitly excludes this host. |
| Runtime PokéAPI list/detail requests | Not selected: extra requests for types, first-use/offline dependency, returned image URLs typically point at raw GitHub. |
| jsDelivr CDN plus runtime service-worker cache | Selected: a single disclosed image host; animated and still variants; no full collection in the bundle. |

Documentation: [jsDelivr](https://www.jsdelivr.com/documentation), [PokéAPI](https://pokeapi.co/docs/v2). Their public endpoints were checked read-only during implementation using the agent-reach web-fetch workflow; no GitHub CLI was used.

Host: `cdn.jsdelivr.net`. Base: `/gh/PokeAPI/sprites@master/sprites/pokemon/`. Stage 2 hero images use `other/official-artwork/{id}.png` (or `shiny/`), with `other/home/` fallback. The default non-shiny Pikachu is a locally bundled 20,588-byte WebP converted from the official artwork; its source is recorded in `assets/buddies/official-source.json`. Only that one new hero asset is bundled. Fixed image/scene dimensions avoid image-driven layout shift. Small grid images still use `{id}.png` and `shiny/{id}.png`. Missing art retains the selected buddy's name and a friendly picture-needs-internet label; it never substitutes another Pokémon.

Stage 3 adds confirmed GIFs behind a Moving / Artwork toggle, with static art forced for reduced motion. See [observed coverage and behavior](V3-STAGE-3-A.md). The default 23,958-byte GIF is bundled to keep first paint predictable; other GIFs use jsDelivr. Integer pixel sizing finishes before the GIF becomes visible. Failed/missing GIFs use official art and finite procedural motion. No animated filters/shadows are used.

The chooser now virtualizes a scrolling list: 3/4/6 columns depending on available width, one row of overscan in each direction, explicitly sized tiles, asynchronous image decoding with eager overscan rows, content-visibility and layout/paint containment. Search normalizes punctuation, accents and gender symbols once per key/catalog entry, and treats numeric input as an exact ID (including leading zeroes). It filters the local catalog immediately; generation and type filters compose. Keyboard arrows/Home/End can reach all 1,025 entries, with list size/position exposed to assistive technology. Six recents maximum, with no collection progress.

Visited sprite GETs use CORS and no-referrer, are cached on-device, and are measured by a 12 MiB byte budget with serialized writes, a 1 MiB entry ceiling and FIFO eviction. The CDN receives normal network metadata such as IP, never question/voice payloads. The default hero, full metadata, activity modules and authored public shell work offline after first load. Unvisited pictures still need internet. Mutable `master` is isolated in the buddy module; a verified pinned revision remains future work. All rights remain with their respective holders; the required fan-project notice is in the grown-ups panel and footer.
