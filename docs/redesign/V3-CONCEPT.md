# PokeLearn v3 — a Pokémon you talk to

Stage 1: main scene, all-1025 chooser, mock voice loop. Branch from v2; main supplies Pokémon identity, selector and direct recording → transcription → answer flow. No activities UI until the user says continue. The six authored activities and policy tests stay intact.

## Main scene (phone; tablet expands the landscape)

    ┌────────────────────────────────┐
    │ PokeLearn       [⚙ Grown-ups]   │
    │ [▦ Change buddy]    [☾ Sleep]   │
    │       clouds / blue sky        │
    │       PIKACHU · electric        │
    │                                │
    │       / large tappable /       │
    │      / living Pokémon /        │
    │      / ~52% screen h /         │
    │         meadow & shadow        │
    │   ╭──────────────────────╮     │
    │   │ Pika! I'm here.      │     │
    │   ╰──────────────────────╯     │
    │ [⌨ Type] [● Tap to talk]       │
    │       [♪ Read aloud]           │
    └────────────────────────────────┘

No hero card, tabs, activity cards, default text form, counters or continuation prompts. Thick ink outlines, offset shadows, sticker labels, illustrated CSS scenery, squash/stretch, random idle bob/blink/yawn/peek, tap particles. Target buttons at least 56px. Motion reduction switches animated images to stills as well as removing CSS motion.

## Pokédex chooser

    ┌────────────────────────────────┐
    │ ▦ Choose your buddy [× Close]  │
    │ [⌕ Name or number___________]  │
    │ [✧ Shiny] [⚄ Surprise me]      │
    │ Recently met                   │
    │ [Pikachu] [Eevee] [Bulbasaur]   │
    │ ┌────────┬────────┬─────────┐  │
    │ │ sprite │ sprite │ sprite  │  │
    │ │ #001   │ #002   │ #003    │  │
    │ │ name   │ name   │ name    │  │
    │ │ 🌿type │ 🌿type │ 🌿type  │  │
    │ └────────┴────────┴─────────┘  │
    │ [← Back] page 1 / 43 [Next →]  │
    └────────────────────────────────┘

Local metadata for all 1025, including types, avoids 1025 detail requests. Show 24 results per page, lazy image loading, bounded DOM, search name or ID. Recent buddy shelf contains six choices, not collectibles. Persistent recent choices require grown-up device-saving opt-in.

## Speaking state

    ┌────────────────────────────────┐
    │           PIKACHU              │
    │          / bounce /            │
    │      ╭────────────────────╮    │
    │      │ Leaves use light   │    │
    │      │ to make food.      │    │
    │      ╰────────────────────╯    │
    │    [■ Stop]  [⌨ Type]          │
    └────────────────────────────────┘

Listening: lean in and pulse ring; second tap stops. Real recorder uses RMS silence detection, auto-end after speech and a bounded quiet-device fallback, no visible countdown. Thinking: tilt and hmm bubble. Speaking: bounce and full persistent captions. Friendly error appears only after an attempted action. No initial voice error. Sound starts off; enabling Read aloud is a deliberate user gesture. Captions work without audio. Mock (?mock=1) simulates listening, silence, thinking and answers without mic access or provider requests; label mock listening honestly.

## Permission and data

One-time microphone/online consent lives behind a simple arithmetic parental gate in Grown-ups and is remembered on-device. The child sees no repeated permission messages. First-use mic opens that panel with a neutral setup caption. Native browser microphone permission is separate. No Web Speech recognition service. Recordings go to Valsea through Netlify; transcripts/questions go to OpenRouter through Netlify. OpenRouter chooses the actual downstream inference host. No sentiment calls. Questions, audio, answers and transcripts are never persisted or cached. No chat history or follow-up pressure.

## Sprite decision

Evaluate: direct raw GitHub (rejected); runtime PokéAPI lookup (needs extra requests and typically returns raw GitHub sprite URLs); jsDelivr public GitHub CDN plus service-worker caching (chosen). Documentation: https://www.jsdelivr.com/documentation and https://pokeapi.co/docs/v2 . Fetch from cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon: animated other/showdown/{id}.gif where available, fallback still {id}.png, then locally bundled Pikachu/Bulbasaur fallback where available. Shiny variants use showdown/shiny and shiny directories. Reduced motion always requests still images. If offline and unvisited, show an explicitly labelled unavailable sprite; never silently substitute a different Pokémon. Only the two existing v2 sprite assets stay bundled. Cache visited successful sprites with a 180-entry bound, no prefetch of the entire collection. Mutable upstream path is isolated in buddy.js; pinning to a verified revision can follow later. Grown-ups lists cdn.jsdelivr.net and the offline limitation. Catalog source: PokeAPI CSV metadata via jsDelivr, ids 1–1025 only.

Names, sprite URLs, type identities and character personality access live behind buddy.js. The unchanged main personality file informs character voice; forbid endless-chat rules in the main app. No raw GitHub runtime host. Self-hosted Readex Pro retained. EN/SI/TA transcription retained; new SI/TA interface drafts tracked explicitly in the translation review. Prerecorded authored-line support before speechSynthesis; assets and activity integration deferred to Stage 2.

## Verification and boundary

Commit this concept first, push milestone. Build scene and chooser, capture phone 390×844, tablet portrait 820×1180 and tablet landscape 1180×820. Review and fix twice; retain each round and final images. Verify mock loop, search #1025, shiny, pagination, recent choices, no automatic microphone/audio/provider requests, touch targets, reduced motion, offline shell/sprites and one-time setup. Existing v2 activity browser scripts describe the old screen; retain them for Stage 2 adaptation rather than claiming they pass. Do not change Netlify functions/settings, deploy, merge, rewrite history or touch main.
