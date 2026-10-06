# PokeLearn

A voice-first game for ages 6–9: choose any of 1,025 Pokémon as a teacher, tap the mic and talk. Persistent captions, keyboard fallback, six finite authored activities as scene props, and a calm Sleep ending. Moving / Artwork switches confirmed animated GIFs and official artwork; reduced motion stays static. No streaks, counters, reminders, notifications, autoplay or endless follow-ups.

Stage 3 Part A is on `redesign/kid-friendly-v3`. This `backend/hardening` branch starts from that checkpoint and adds separately reviewable server safeguards. No deployment/merge or Netlify setting change. See [Part A coverage/screens/performance](docs/redesign/V3-STAGE-3-A.md) and [Part B findings/tests/limits](docs/redesign/V3-STAGE-3-B.md).

## Local scene / mock

Node **22.12+**:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4178/?mock=1`. Mock uses no microphone or providers. `/` is the normal voice-first scene. Rebuild after edits; close old app tabs to activate a waiting service-worker update. The server only exposes the allowlisted public build, not `.env`, sources, tests or private files.

## Local real functions

Install the Netlify CLI locally or use an already installed `netlify`. No login/link/deployment is required for offline local development. Use [the blank example](.env.example) to add server-only settings to ignored `.env`; preserve existing keys if that file already exists and fill missing values privately. Set a **32+ character random `RATE_LIMIT_SALT`**; never use an API key as the salt. `ALLOWED_ORIGINS` must include the exact local origin and later the intended production origin. No wildcard. `PAUSE_AI=true` stops all provider access. Default global upstream-attempt cap is 200 per UTC day; shared-IP cap is 8 attempts per minute. Caps include chat retries and voice uploads.

```sh
npm run build
netlify dev --offline --no-open
```

Open `http://localhost:8888/`. Netlify Dev runs the real functions and a local Blobs sandbox; `--offline` disables Netlify account/network setup, **not** the handlers' provider calls. In `.env`, `LOCAL_AI_LIMITS=memory` is optional for the lightweight `npm start` server, restricted to loopback URLs. Remove it to exercise Netlify Dev's native local Blobs. Deployed functions always need working Blobs and a private salt; unavailable quotas fail closed. The example's development origins are not a production configuration and have not been applied remotely.

`GET /api/health` returns only `{openrouter: boolean, valsea: boolean}` for key presence, not key validity or provider health. Chat and transcription accept `/api/chat` / `/api/transcribe` and the conventional `/.netlify/functions/…` paths. The sentiment function is **removed**.

```sh
npm run check:models
POKELEARN_TEST_URL=http://localhost:8888 npm run smoke:live
```

Model checks query the public OpenRouter catalog, with no key. The live smoke loads ignored `.env`, skips calls without local keys, sends only a synthetic science question and generated WebM/MP4 tones to the local function server, and prints only status/error codes. Synthetic silence/tone acceptance does not prove speech recognition accuracy. It can consume existing Valsea credits. This pass observed Valsea accepting both formats but OpenRouter returning no eligible private endpoints; the deterministic resting fallback worked. No successful live generated lesson was verified. Details are in the Part B report.

## Checks

With a built server running:

```sh
npm test
npm run test:backend
POKELEARN_TEST_URL=http://localhost:8888 npm run test:ui
POKELEARN_TEST_URL=http://localhost:8888 npm run test:v3
POKELEARN_TEST_URL=http://localhost:8888 npm run test:animation
POKELEARN_TEST_URL=http://localhost:8888 npm run test:pwa
```

Install the pinned Chromium browser once with `npx playwright install chromium`. Browser tests mock providers/child recordings; backend tests use an adversarial corpus, concurrency and synthetic audio fixtures. Only axe's injected test script bypasses CSP; a separate test proves the actual CSP blocks inline script. Final phone/tablet screenshots and varied reaction frames are linked from Part A.

## Data, providers and limitations

[Privacy and processing details](PRIVACY.md). Netlify hosts/proxies, Valsea receives voice, OpenRouter receives permitted questions/transcripts and routes to a downstream inference host. Explicit ordered free models: Gemma 4 31B, Nemotron 3 Super, Gemma 4 26B. No free-router. Requests enforce zero-price/no-data-collection/zero-retention routing flags; provider compliance and downstream identity are not independently verified. Filtering may leave no eligible free provider. Valsea retention is not controlled by this app.

The app does not persist/cache questions, transcripts, audio or answers. Quotas persist counts and daily salted IP hashes in Netlify Blobs; cleanup is best effort on activity, not automatic TTL. Application telemetry logs only error codes, latency and the selected model. Netlify/provider logging remains outside that assertion. Private text detected by regex is withheld from providers; audio can contain private/background speech before transcription. Server output checks are restrictive heuristics, **not a complete moderation system or factual guarantee**. The device arithmetic gate and consent header are not authenticated parental consent.

Sound starts off; mic/read-aloud gestures permit local playback unless muted. Captions continue silently if no local voice is available. Authored prerecorded playback is supported, but **no reviewed production recordings are bundled**.

`buddy.js` keeps identities/art/search behind a swappable boundary. Sprite host: `cdn.jsdelivr.net`; static virtual-grid thumbnails, one hover/touch preview, measured 12 MiB image cache, single bundled default GIF/artwork. [Observed source coverage](docs/redesign/V3-STAGE-3-A.md). Unvisited pictures still need internet.

EN/SI/TA controls/transcription remain available; Sinhala/Tamil additions are machine-translated drafts awaiting [human review](docs/redesign/V3-TRANSLATION-REVIEW.md). Authored/science answers remain English. Self-hosted Readex Pro includes its [OFL](assets/fonts/OFL.txt).

Unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.
