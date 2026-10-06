# Buddy data and sprite sourcing

The sole identity/sprite boundary is `buddy.js`. The scene asks it for IDs, display names, types, greeting, personality, image and search results. Replacing that module and its catalog can replace the character collection without changing the scene controller.

Catalog: 1,025 default Pokémon, IDs 1–1025, from PokeAPI's `pokemon.csv`, `pokemon_types.csv` and `types.csv`, accessed at `cdn.jsdelivr.net/gh/PokeAPI/pokeapi@master/data/v2/csv/`. The local JSON is about 66 KB and holds only public ID/name/type data. This avoids one API call per tile and makes the complete search available offline. Personalities are the unchanged repository file used by main, read through the module.

Options evaluated:

| Option | Decision |
| --- | --- |
| Raw GitHub image URLs from main | Rejected: user explicitly excludes this host. |
| Runtime PokéAPI list/detail requests | Not selected: extra requests for types, first-use/offline dependency, returned image URLs typically point at raw GitHub. |
| jsDelivr CDN plus runtime service-worker cache | Selected: a single disclosed image host; animated and still variants; no full collection in the bundle. |

Documentation: [jsDelivr](https://www.jsdelivr.com/documentation), [PokéAPI](https://pokeapi.co/docs/v2). Their public endpoints were checked read-only during implementation using the agent-reach web-fetch workflow; no GitHub CLI was used.

Host: `cdn.jsdelivr.net`. Base: `/gh/PokeAPI/sprites@master/sprites/pokemon/`. The main buddy requests `other/showdown/{id}.gif` or its `shiny/` variant, with `other/home/{id}.png` or its shiny variant as fallback. Reduced motion requests the still directly. Where the still fails, the two already bundled v2 pictures can cover Pikachu/Bulbasaur, only for non-shiny variants. No silent substitution of an unrelated Pokémon. Unvisited unavailable sprites show the buddy's name and a picture-needs-internet caption.

The chooser uses the compact `{id}.png` and `shiny/{id}.png` files: the larger Home pictures proved too slow for tablet browsing during review. Thumbnail frames enlarge these compact sprites. Twenty-four choices per page, lazy loading, six recent choices maximum, no collection progress. CORS-enabled image requests allow successful-response-only caching. The service worker caches at most 180 visited sprite responses, serializes writes to enforce the limit, and never caches function calls, audio, answers or transcripts. Image requests use no-referrer; the CDN still receives normal network metadata such as IP. The mutable `master` source is intentionally isolated here; a verified pinned revision remains future work.

No images were added to the repository. Public metadata was added. The artwork belongs to its respective rights holders. The grown-ups panel and footer carry the requested fan-project notice. Offline first visits and never-visited pictures require internet; ordinary subsequent offline visits retain the shell, full catalog and cached pictures.
