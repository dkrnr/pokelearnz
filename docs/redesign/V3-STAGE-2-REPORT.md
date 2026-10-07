# PokeLearn v3 — Stage 2 checkpoint

Work is confined to the standalone `/performance/projects/dkrnr/pokelearn` repository. Branch: `redesign/kid-friendly-v3`, tracking origin. No main commit, parent commit, history rewrite, force push, merge, deployment or Netlify setting/function change. Existing untracked handoff/research files were left untouched. Stage 2 stops at this report.

## Delivered

Performance work came first and was pushed before feature work. The default hero now uses a preloaded 21 KB official-artwork WebP; other heroes use official artwork through the swappable buddy module, with Home fallback. Compact sprites remain in the chooser. Fonts are compressed, self-hosted WOFFs. Motion animates only transform/opacity, continuous idle animation is removed, and dialogs pause the underlying buddy. Fixed image/scene dimensions and reserved caption space avoid startup and delayed-answer layout shift. Phone/landscape artwork and props were adjusted to leave room for readable captions.

The Pokédex scrolls with 3/4/6 columns, bounded visible rows plus overscan, lazy decoding, containment and content-visibility. All 1,025 entries remain searchable offline. Generation controls, a type filter, shiny, filtered Surprise me and six recents work together. Name search accepts punctuation, accents and gender symbols; numeric IDs also accept leading zeroes. Arrow keys/Home/End traverse the catalog; its virtual list exposes size/positions. No Back/Next pagination remains. Visited CDN pictures are cached with a 180-image limit; no full image collection was bundled.

Six physical scene props open the preserved finite authored activities: plant, fish, blocks, shapes, bee/sounds and storybook. Captions precede narration, and a selected-buddy badge keeps the teacher present. Incorrect choices have calm feedback, steps can reset, number blocks can be removed, and children can leave at any time. Completion celebrates once per activity per visit, shows the authored recap and real-world suggestion, then Done for now leads to the calm ending. Reopening an activity adds no extra completion reward. Activities do not call providers and work offline.

The tap reaction has a visible squash, 65px hop, stretch/tilt, landing squash and seven bounded particles. Repeated taps replace the particles and restart one finite reaction. Reduced motion uses a caption response. No optional tap sound was added; sound remains an explicit choice.

Parental setup uses randomized `(12–29 × 3–9) + 11–29`, with a new question each locked opening. Permission remains remembered on-device. This is a simple UI gate, not authentication. Core EN/SI/TA voice controls and transcription selection remain; new prop/tap translations are explicitly listed as machine-translated drafts in [the review file](V3-TRANSLATION-REVIEW.md). Authored content and some chooser/activity labels remain English.

Prerecorded authored narration is supported through a same-origin manifest, native audio playback, optional public asset precaching, local speechSynthesis fallback and silent captions. It starts only after deliberate sound/mic use, and stops on mute/Back/Escape/Sleep. **No reviewed production recordings are included.** The playback path was verified with a generated WAV fixture; there is no cloud TTS. See [recording instructions](../../assets/audio/README.md).

Legacy stored question data is removed on restore/clear, and generated-answer pressure checks retain the stopping requirements. No histories, notification API, counters, timed pressure, reminders or endless-follow-up prompts were added. “Practice mode” is restricted to `/?mock=1`.

## Performance

Final median LCP **1.070s**, CLS **0**, and **0** chooser-scroll tasks over 100ms (20 mounted tiles after 7,800px). See [complete before/after measurements and caveats](V3-PERFORMANCE.md). Budget: mobile LCP under 2.5s with real DevTools 4× CPU slowdown; zero startup CLS; no tablet chooser-scroll tasks over 100ms. Final measurements are laboratory results for the default buddy, not a guarantee on every real device or every uncached remote hero. The baseline's reported LCP is incomplete because it selected scenery while the animated image stalled; no misleading percentage speed-up is claimed.

Raw Lighthouse JSON/HTML and summaries remain in ignored `qa/artifacts/performance/`; reproducible harness is [scripts/profile-mobile.mjs](../../scripts/profile-mobile.mjs). No test output, secrets, .env or node_modules are committed.

## Screenshots and tap evidence

| View | Before hero | After normal scene | After chooser |
| --- | --- | --- | --- |
| Phone 390×844 | [Stage 1](screens/v3-final/phone-scene.png) | [Stage 2](screens/v3-stage2-final/phone-normal-scene.png) | [Pokédex](screens/v3-stage2-final/phone-chooser.png) |
| Portrait 820×1180 | [Stage 1](screens/v3-final/tablet-portrait-scene.png) | [Stage 2](screens/v3-stage2-final/tablet-portrait-normal-scene.png) | [Pokédex](screens/v3-stage2-final/tablet-portrait-chooser.png) |
| Landscape 1180×820 | [Stage 1](screens/v3-final/tablet-landscape-scene.png) | [Stage 2](screens/v3-stage2-final/tablet-landscape-normal-scene.png) | [Pokédex](screens/v3-stage2-final/tablet-landscape-chooser.png) |

[Tap before](screens/v3-stage2-tap/000-before.png) → [squash 100ms](screens/v3-stage2-tap/100-reaction.png) → [hop 350ms](screens/v3-stage2-tap/350-reaction.png) → [landing 650ms](screens/v3-stage2-tap/650-reaction.png) → [settled 900ms](screens/v3-stage2-tap/900-reaction.png).

[Plant](screens/v3-stage2-final/phone-activity-plants.png), [fish](screens/v3-stage2-final/phone-activity-homes.png), [blocks](screens/v3-stage2-final/phone-activity-numbers.png), [shapes](screens/v3-stage2-final/phone-activity-shapes.png), [sounds](screens/v3-stage2-final/phone-activity-sounds.png), [story](screens/v3-stage2-final/phone-activity-story.png), [calm end](screens/v3-stage2-final/phone-calm-end.png).

Two documented visual review/fix rounds and final inspection: [review record](V3-STAGE-2-VISUAL-REVIEW.md). Final screenshot folder also includes all three listening/thinking/speaking states and activity recaps. Some remote pictures failed or stalled; those captures retain labels/placeholders rather than certifying CDN coverage.

## Verification

- `npm run build`: public allowlist build passed. Backend files/settings and the six authored activity definitions are unchanged from the Stage 1 checkpoint.
- `npm test`: all six original tests retained and passing; three additional checks enforce transform/opacity-only keyframes, authored-player network isolation/local audio paths, and punctuation/Unicode/padded-number catalog search (nine total).
- `npm run test:ui`: passing chooser/voice mock flow, generation/type/search/shiny/recents, keyboard traversal, randomized gate, one-time consent persistence/withdrawal, SI/TA drafts, no automatic audio/mic/provider calls, denied-mic fallback, WCAG A/AA scans, all six lessons at all three sizes, calm endings, reset/mistakes/reversal/focus, offline lessons and absence of private/API content in caches.
- Ported v2 privacy/stopping checks pass: legacy question deletion, two-message requests without history, blocked storage, local-only speech and silent unavailable-voice behavior, pressure/long/empty generated-answer rejection, late answers after Stop/Sleep/parent/buddy changes, and late microphone permission releasing its track. Obsolete card/tab selectors were replaced with the voice-first regression entry point.
- `node tests/v3-voice.mjs`: browser MediaRecorder/RMS silence auto-end, multipart transcription→answer contract, track release and cancellation pass with a generated tone/silence stream and mocked providers. No real child voice was recorded/uploaded.
- `npm run test:pwa`: waiting service-worker update preserves an in-progress lesson, activates next visit and deletes the old shell.
- `node tests/v3-caption.mjs`: delayed four-sentence replies produce zero CLS at all three sizes, fit completely, and leave props clear; missing art preserves the selected buddy identity.
- `node tests/v3-tap-capture.mjs`: real CSS frame evidence and reduced-motion caption feedback pass.
- Final capture: no page exceptions, no horizontal overflow, visible buttons >=56px, document scroll 0.

## Backend and remaining verification limits

[All three function reviews and 20 child-risk findings](V3-BACKEND-REVIEW.md). Main concerns are free-router/model uncertainty, no server safety prompt or output moderation, unvalidated direct requests, no server consent/authentication/rate limits, child voice/question disclosure to providers, STT misinterpretation, and missing upstream cancellation/timeouts/retention controls. The frontend's short-answer/keyword rules (including a 220-character cap) are limited protection. The unused sentiment endpoint remains exposed but this UI never calls it. No function was modified.

Not verified: physical phone/tablet speed, Safari/iOS/Android installation and mic permissions, actual device speaker sound/voices, live Valsea/OpenRouter requests or child suitability of generated answers, provider routing/retention/deletion/logging policies, every normal/shiny/official-artwork variant, uncached non-default hero LCP, screen-reader usability with a virtual list, and human review of SI/TA drafts. No production authored recordings were created or reviewed. Desktop Chromium emulation and local fixtures do not replace those checks.

## Local run and milestones

    npm ci
    npm run build
    npm start

Open `http://127.0.0.1:4178/?mock=1` for a provider/microphone-free voice loop; `/` shows the normal scene. Rebuild after edits. Close older app tabs for a waiting service-worker update to activate. The existing Node module-type warning remains because Netlify handlers are CommonJS.

For browser checks, install the pinned Playwright browser once with `npx playwright install chromium`. While the server runs:

    npm test
    npm run test:ui
    npm run test:v3
    npm run test:pwa
    REVIEW_ROUND=v3-check npm run screenshots:v3
    node tests/v3-tap-capture.mjs

All browser scripts default to port 4178. For a different port set `POKELEARN_TEST_URL`. Lighthouse reproduction is documented in the performance report.

Pushed Stage 2 implementation milestones:

- `0715e3e` — performance first: official hero preload, compressed fonts and bounded scene rendering.
- `8a01060` — scene discoveries, virtual chooser/filters, tap feedback and harder gate.
- `f2a00bf` — privacy/stopping fixes and complete v3 regression entry points.
- `fbaab05` — stable delayed captions and missing-artwork identity, verified at all three sizes.
- `c97cce0` — punctuation, accent, gender-symbol and padded-number search, with numeric IDs matched exactly.
- The report/screenshots checkpoint is the commit containing this file.

[Compare v2 → v3 on GitHub](https://github.com/dkrnr/pokelearnz/compare/redesign/kid-friendly-v2...redesign/kid-friendly-v3). No GitHub CLI was used. Stopped after Stage 2 as requested.
