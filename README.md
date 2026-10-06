# PokeLearn

A voice-first game for children aged 6–9: choose any of 1,025 Pokémon as your teacher, then tap the microphone and talk. The buddy lives in a full-screen meadow, listens, thinks, speaks with persistent captions, and can take a calm rest. A small keyboard button provides the text fallback.

This branch is the **v3 Stage 1 checkpoint**: main scene, Pokédex chooser and mock voice loop. Six authored activities remain in `activities.js`; scene props and activity integration wait for Stage 2. See [the concept](docs/redesign/V3-CONCEPT.md), [checkpoint report](docs/redesign/V3-STAGE-1-REPORT.md) and [visual review](docs/redesign/V3-VISUAL-REVIEW.md).

## Run locally

Node 22 or later:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4178/?mock=1` for a labelled pretend voice conversation with no microphone or provider requests. Tap the mic again to stop, or let the simulated silence end the turn. Without `mock=1`, live transcription/questions use the unchanged Netlify functions and require configured server keys and one-time grown-up consent.

Rebuild after source edits. The local server serves only the allowlisted `dist/` build, not private repository files. An older installed service worker can wait until its existing tabs close before taking control.

## Stage 1 verification

With the local server running:

```sh
npx playwright install chromium
npm test
npm run test:v3
REVIEW_ROUND=v3-review npm run screenshots:v3
```

The original six server/content/policy tests remain unchanged. Stage 1 browser checks cover voice states, silence/stop, cancellation, the complete selector, shiny/recent choices, one-time consent, draft languages, reduced motion, offline shell/visited sprites, WCAG A/AA scans, large touch targets and no automatic microphone/audio/provider requests. Recorder integration uses a generated tone/silence stream and mocked provider responses.

The older `test:ui`, `test:pwa` and `screenshots` scripts describe the v2 card/tab/activity UI and are preserved for Stage 2 adaptation. They are not v3 verification claims. Final captures for 390×844, 820×1180 and 1180×820 are under `docs/redesign/screens/v3-final/`, with two review rounds alongside them.

## Voice, buddies and device data

One-time voice/online consent lives behind a simple grown-up gate and is remembered on this device. Remembering buddy/recent choices is a separate optional setting. Questions, recordings, transcripts and answers are not saved or cached. Sound starts off on load; a mic tap authorizes a spoken reply unless explicitly muted. Missing local speech voices degrade silently to captions. Authored-line playback supports local prerecorded audio before speechSynthesis; authored recordings are Stage 2 work.

Netlify hosts/proxies requests. Valsea receives recordings; OpenRouter receives questions and transcribed voice text, routing to its selected inference provider. Configured model families are Google Gemma, NVIDIA Nemotron, InclusionAI Ling and OpenRouter's free-router fallback. Actual downstream hosting cannot be identified by the frontend. No sentiment requests are sent. Netlify functions and settings were not changed in this pass.

`buddy.js` isolates identities, types, personalities, sprite URLs and search. The catalog is local public metadata; images come from `cdn.jsdelivr.net`, with animated-to-still fallback, lazy paginated thumbnails and a bounded visited-sprite service-worker cache. No full sprite collection is bundled and no raw GitHub images are hotlinked. See [sprite sourcing](docs/redesign/V3-SPRITES.md). Unvisited offline pictures may need internet.

EN/SI/TA remain available. New Sinhala/Tamil interface strings are machine-translated drafts; remaining English controls and review needs are recorded in [the translation review](docs/redesign/V3-TRANSLATION-REVIEW.md). Self-hosted Readex Pro includes its SIL Open Font License in `assets/fonts/OFL.txt`.

Unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.
