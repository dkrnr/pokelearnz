# Stage 3 Part A — animated buddies

Work is confined to PokeLearn on `redesign/kid-friendly-v3`. No function or Netlify configuration/settings change, deployment, merge or rewritten history.

## Observed animation coverage

On 2026-10-06, `scripts/probe-sprites.py` probed all 1,025 normal and all 1,025 shiny URLs under `cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/animated/` (shiny subdirectory for shiny). HEAD responses: HTTP 200 **and** image/gif accepted; only HTTP 404 confirms absence. Three attempts for transient failures. Zero unverified results. Full per-ID response/status/bytes evidence: [sprite-probe.json](sprite-probe.json). Generated runtime manifest: `animated-coverage.js`. Directory APIs/listings were rejected for package-size limits, so these counts come from individual URL probes, not an assumed generation boundary. HEAD proves GIF availability, not every frame's artistic quality or a permanent availability guarantee.

| National generation | IDs | Normal GIF | Shiny GIF |
| --- | --- | ---: | ---: |
| 1 | 1–151 | 151/151 | 151/151 |
| 2 | 152–251 | 100/100 | 100/100 |
| 3 | 252–386 | 135/135 | 135/135 |
| 4 | 387–493 | 107/107 | 107/107 |
| 5 | 494–649 | 156/156 | 156/156 |
| 6 | 650–721 | 54/72 | 52/72 |
| 7 | 722–809 | 74/88 | 74/88 |
| 8 | 810–905 | 66/96 | 65/96 |
| 9 | 906–1025 | 25/120 | 25/120 |
| Total | 1–1025 | **868/1025** | **865/1025** |

Only the default 23,958-byte Pikachu GIF is locally bundled, with source attribution. All other animations use the confirmed same jsDelivr host. No new image host and no full sprite collection are bundled. Moving is the default, Artwork is a child-accessible icon/word toggle; reduced motion always uses static art. A failed GIF falls back to official artwork/Home. Available GIFs are displayed at integer multiples of their own native size with `image-rendering:pixelated`. They share a fixed scene container and ground shadow. While dialogs, Sleep or a hidden document pause the scene, the hero switches to static artwork. Missing-animation buddies use finite random breathe/bob/tilt/blink/yawn motions. The overall scene stays anchored while art loads; pixel images become visible after integer sizing.

## Other testing fixes

- Six different tap reactions: hop, giggle, peek, twirl, wiggle, stretch. Each has a different caption, particle mark and transform animation. Selection excludes the previous reaction; reduced motion keeps the caption. Optional sound was omitted so tap feedback never adds automatic sound.
- Grid uses static PNGs and a Poké Ball silhouette while loading. One overscan row before/after the visible window eagerly decodes pictures before they scroll into view. Only the touched/hovered tile previews its GIF (or a CSS wiggle); previous previews stop, and previews end after 1.5 seconds.
- Type selection is 19 large icon/word chips with type colors, pressed-state outlines and 56px targets. It composes with generation/search/shiny.
- Service-worker sprite caching now measures actual readable CORS body bytes with a **12 MiB** budget and **1 MiB** single-image ceiling; opaque responses are not cached. FIFO eviction happens before insert, and a saved public size index survives worker restart. Old count-only cache is removed. Questions, transcripts, recordings and API responses remain excluded. Byte accounting describes payload bytes, not browser storage overhead. The public index adds a small bounded overhead.
- Opening any activity stops the recorder, stream tracks and pending requests. Activity narration can use the speaking state but the hidden mic stays disabled and labelled “Tap to talk”, never “Stop”.
- Sleep shows only static sleeping-buddy art, the calm message and Wake buddy. Navigation/props/voice controls are hidden and inert; Wake restores them.
- Each of the six activities is tested start to finish at phone/portrait/landscape sizes, including a wrong answer and Done for now. All keep authored wording, stopping rules and no provider calls.

## Verification and review artifacts

`npm test` (10 tests), `tests/v3-animation.mjs`, `tests/v3-activities.mjs`, `tests/v3-smoke.mjs`, plus motion captures and the throttled performance harness. Screens: [phone](screens/v3-stage3-a/phone-normal-scene.png), [portrait](screens/v3-stage3-a/tablet-portrait-normal-scene.png), [landscape](screens/v3-stage3-a/tablet-landscape-normal-scene.png), [chooser](screens/v3-stage3-a/phone-chooser.png), [sleep](screens/v3-stage3-a/phone-calm-end.png). Real CSS tap frames: [hop](screens/v3-stage3-tap/350-reaction.png), [giggle](screens/v3-stage3-tap/giggle.png), [peek](screens/v3-stage3-tap/peek.png), [twirl](screens/v3-stage3-tap/spin.png), [wiggle](screens/v3-stage3-tap/wiggle.png), [stretch](screens/v3-stage3-tap/stretch.png).

Limits: no physical tablet/Safari/Android verification; no inspection of all 1,733 GIFs' frames, shiny colors or embedded transparent margins. Uncached remote animation latency depends on the CDN. No new production narration recordings. SI/TA additions remain machine-translated drafts.

## Performance before / after (same Lighthouse 12.8.2 settings)

| Metric | Stage 2 | Stage 3 Part A |
| --- | ---: | ---: |
| Mobile LCP median, 4× CPU / 150ms / 1,638 Kbit/s | 1.070s | **1.237s** |
| LCP range | 1.067–1.091s | 1.226–1.247s |
| CLS | 0 | **0** |
| TBT median | 0ms | 0ms |
| Lighthouse performance | 100 | 100, no warnings |
| Audited transfer median | 301 KB | 354 KB |
| Tablet chooser open | 112ms | 165ms |
| Scroll tasks >100ms, 7,800px scroll | 0 | **0** |
| Mounted tiles | 20 | 20 |

The added coverage manifest/local GIF increases transfer and slightly increases LCP; the <2.5s budget still passes. LCP can retain the initial artwork candidate (the animated sprite has a smaller painted area). To avoid claiming LCP proves animation readiness, a separate cold Playwright/CDP check blocks service workers, uses 4× CPU and the same network throttle, and waits for integer-sized visible GIF + two frames: 1.744 / 1.737 / 1.736s, median **1.737s**. Cached LCP median 72ms is supplementary and not directly comparable to a cold Lighthouse run. See [Stage 2 methodology/caveats](V3-PERFORMANCE.md). Raw Stage 3 JSON/HTML remain ignored under `qa/artifacts/performance/stage3-a-final-*`; `scripts/profile-mobile.mjs` enforces the budget. First sizing attempt had CLS 0.00774; hiding the loading pixel image until sized removes it. A landscape toggle/name overlap and idle interrupting tap feedback were also fixed during browser review.
