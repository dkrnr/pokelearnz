# PokeLearn

A voice-first game for ages 6–9: choose any of 1,025 Pokémon as a teacher, tap the mic and talk. Persistent captions, keyboard fallback, six finite authored activities as scene props, and a calm Sleep ending. Moving / Artwork switches confirmed animated GIFs and official artwork; reduced motion stays static. No streaks, counters, reminders, notifications, autoplay or endless follow-ups.

The UI checkpoint is on `redesign/kid-friendly-v3`. This `backend/hardening` branch starts from that checkpoint and adds separately reviewable server safeguards. No deployment/merge or Netlify setting change. See [Stage 4 development and repository report](docs/redesign/V3-STAGE-4.md), [Part A coverage/screens/performance](docs/redesign/V3-STAGE-3-A.md) and [Part B findings/tests/limits](docs/redesign/V3-STAGE-3-B.md).

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

Model checks query the public OpenRouter catalog using the same ordered `OPENROUTER_MODELS` list as chat, with no API key. The script loads `.env` only for configuration; keys are never sent to the catalog. Override the comma-separated list when free models disappear. Invalid, duplicate, paid, guard/classifier and router IDs fail closed. Default order: NVIDIA Nemotron 3 Super, Google Gemma 4 31B, Google Gemma 4 26B. Each gets a 4-second deadline and one retry, within a 14-second total server budget. The browser bounds the combined transcription/answer turn at 15 seconds and has transient-state watchdogs. Every upstream attempt reserves quota. No free-router, streaming or unbounded retries.

`AI_PROVIDER=openrouter` selects the adapter in `netlify/lib/providers`; the interface is `configured()`, `models()`, `complete({model,system,question,signal})`. Another adapter can be registered without changing safety, chat orchestration or the UI. `AI_PRIVACY=account` inherits existing OpenRouter account privacy options; the application never changes those options or sends an explicit collection allowance. Free endpoints can retain or train on questions depending on account settings and provider policies. `AI_PRIVACY=strict` additionally requests no collection and zero retention, which can leave no eligible free endpoints. Zero-price limits stay enforced in both modes. A private/paid provider decision and policy review are required before public launch.

`DEMO_MODE=true` selects a curated bank of 22 common questions without a chat-provider call. Normal mode also uses the bank after provider failure or for matched questions without a key. Unmatched failures get a clear, calm authored answer. Origin/consent/input safety and the pause switch remain enforced; unavailable quota storage and rate limits retain their friendly error states. Unsafe model content goes to a trusted grown-up; reading/format misses use bounded retries before the bank. No developer message is shown to children. **Demo questions still require the device's online consent; voice still uses Valsea**. Use `?mock=1` or offline activities when no upload is wanted.

The live smoke loads ignored `.env`, skips calls without local keys, and sends only synthetic science questions and generated WebM/MP4 tones to the local function server. Default output contains only status/error codes. Tones do not prove speech recognition accuracy and can consume existing Valsea credits. Explicit ten-question reporting:

```sh
SMOKE_TEN=1 SMOKE_VOICE=0 POKELEARN_TEST_URL=http://localhost:8888 npm run smoke:live
RUN_LIVE_AUDIT=1 npm run audit:live
```

Ten-question mode prints only the fixed synthetic questions, answers, model IDs and latencies. The adversarial diagnostic sends a fixed synthetic corpus directly to the adapter with the server prompt, deliberately bypassing input rejection **only in the script** to study model responses. It is not exposed as an API. It makes one zero-price, 8-second call per case, at least 3.5 seconds apart, without retries. Heuristic verdicts are recorded in `docs/redesign`; raw synthetic responses stay in ignored `qa/artifacts`. Do not adapt it to real child data. Provider outages/rate limits can leave cases unverified. See the Stage 4 report for actual live outcomes and heuristic misses.

## Core-loop reliability checks

```sh
npm run build
npm run test:core
npm run test:live -- https://deploy-preview-9--pokelearnz.netlify.app/
```

`test:core` loads ignored local `.env`, starts an isolated loopback function server, and uses real providers only when keys exist. It explicitly skips in CI. It uses a process-local memory quota and temporary salt, never remote settings. Ten authored questions and synthetic speech (eSpeak NG, “What do axolotls eat?”) exercise the real adapter, Chrome-native recording, and WebM/MP4 uploads. Results are developer diagnostics containing only synthetic questions, answers, model IDs, source/error codes and latencies. No child data belongs in these reports. Sample audio fixtures are synthesized words, not child recordings. The test records whether a local speech voice actually played; headless browsers commonly have none. Captions stay available without voice. The read-aloud dispatch is separately tested with browser fixtures.

`test:live` starts Playwright against the supplied URL, solves the gate, checks pending-question auto-send, then asks ten fixed questions at a paced rate. It never deploys. Existing previews may be older than this branch; failures are reported rather than silently accepted. Keyword fact checks cover only a few expected concepts, not general scientific accuracy. Exit status is nonzero for a missed concept, invalid answer contract, stuck state or failed gate handoff.

Only a validated `answer` field with a known source can reach captions. Raw `choices`, classifier labels and malformed responses are rejected; the adapter requests strict JSON. Input safeguarding is a separate local step; no guard model generates answers. OpenRouter 429/daily limits stop the cascade immediately and select the authored bank or a calm unknown-answer fallback. A warm-instance backoff avoids repeated quota-burning requests but is not a global persistent circuit breaker. Voice retries transient failures once within ten seconds; failure offers Type. The combined browser turn still ends within fifteen seconds.

After a child taps the mic or sends text, read-aloud starts when a local browser voice exists, respecting an explicit mute. No audio starts on page load. Add `?debug=1`, then unlock the grown-ups panel to see the last model, error code, source (Live model / Demo bank / Kind fallback), whether the explicit `DEMO_MODE` flag answered, and audio status. Debug data contains no question, transcript or recording. Pending gated questions live only in memory and are discarded on cancel, Sleep or page exit. Consent remains remembered on the device; the settings gate needs unlocking once per session.

## Checks

The CI workflow uses Node 24, installs Chromium, builds, and runs every available deterministic regression without AI keys:

```sh
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:all
```

Individual commands with a built server running:

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

[Privacy and processing details](PRIVACY.md). Netlify hosts/proxies, Valsea receives voice, OpenRouter receives permitted questions/transcripts and routes to a downstream inference host. Explicit ordered free models, no free-router. Zero-price limits are enforced; account privacy options are inherited in development. **Free AI providers may retain or train on questions**, depending on those settings and their policies; no zero-retention guarantee is made. [OpenRouter’s provider policy](https://openrouter.ai/docs/guides/privacy/logging) explains separate free/paid training settings and provider-specific retention. Account settings were not inspected or changed. Provider compliance and downstream identity are not independently verified.

[Valsea’s public policy](https://valsea.ai/policies/en), May 2026 version 1.1, states 30-day default retention (different account schedules may apply), encryption in transit/at rest, sharing with necessary cloud and ASR/LLM sub-processors, and no use of audio to train its models without explicit written consent. This is the provider’s statement, not our audit. Its terms require account users to be 13+; applicability to children using a client’s service and parental consent need written clarification before launch.

The app does not persist/cache questions, transcripts, audio or answers. Quotas persist counts and daily salted IP hashes in Netlify Blobs; cleanup is best effort on activity, not automatic TTL. Application telemetry logs only stage, status, error code, latency and the selected model. Netlify/provider logging remains outside that assertion. Private text detected by regex is withheld from providers; audio can contain private/background speech before transcription. Server output checks are restrictive heuristics, **not a complete moderation system or factual guarantee**. The device arithmetic gate and consent header are not authenticated parental consent.

Sound starts off; mic/read-aloud gestures permit local playback unless muted. Captions continue silently if no local voice is available. Authored prerecorded playback is supported, but **no reviewed production recordings are bundled**.

`buddy.js` keeps identities/art/search behind a swappable boundary. Sprite host: `cdn.jsdelivr.net`; static virtual-grid thumbnails, one hover/touch preview, measured 12 MiB image cache, single bundled default GIF/artwork. [Observed source coverage](docs/redesign/V3-STAGE-3-A.md). Unvisited pictures still need internet.

EN/SI/TA controls/transcription remain available; Sinhala/Tamil additions are machine-translated drafts awaiting [human review](docs/redesign/V3-TRANSLATION-REVIEW.md). Authored/science answers remain English. Self-hosted Readex Pro includes its [OFL](assets/fonts/OFL.txt).

Unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.
