# Stage 5 — core-loop reliability

Work is on `backend/hardening`, draft [PR #10](https://github.com/dkrnr/pokelearn/pull/10). The standalone root and origin were confirmed as `/performance/projects/dkrnr/pokelearn` / `dkrnr/pokelearn`. No main changes, merge, force-push, deployment command, Netlify setting change or account change. Private `.env` was read only by explicit local-provider tests, never printed, edited or staged. User-owned untracked notes/research were left alone.

## Axolotl failure and root cause

The published JavaScript accepts a plain `choices[0].message.content` string after a loose sentence/word check. `User Safety: safe` passes that old check: three words, no disallowed terms, no mandatory terminal punctuation. Audited `main` (`193ce3f`) proxies raw OpenRouter output, includes the unrestricted `openrouter/free` fallback, and does not bound upstream fetches. This allows a classifier/control response to be treated as a child's answer and permits long waits.

An **isolated real-key diagnostic**, outside the answer chain, sent the authored question “What do axolotls eat?” to `nvidia/nemotron-3.5-content-safety:free`. It returned the **exact string `User Safety: safe`**, HTTP 200, in **2.413s**. [Recorded result](V3-STAGE-5-CLASSIFIER.json). NVIDIA's [OpenRouter model listing](https://openrouter.ai/nvidia/) identifies this model as a guardrail classifier, not an answer model. The first 64-token probe had null content; the 256-token probe produced the label.

This reproduces the reported string and proves the old boundary defect. It does **not** establish which model served that particular published-site request: no deployed request logs or function source were retrieved. Selection of a classifier by the unrestricted router is a supported explanation, not a confirmed trace of that request. A direct local answer-model probe and the final core test both answered the axolotl question normally. The ten-question older-preview run reproduced the axolotl timeout, but did not emit the classifier label.

The fix is at the provider/API boundary: strict JSON generation and parsing of a single `answer` field, server semantic/reading/safety checks, and a shared browser validator. Raw `choices`, missing/extra fields and classifier labels are never accepted as answers. Regression variants include the exact raw string, a JSON-wrapped classifier answer and a legacy envelope. They select an authored answer on the server or a friendly retry state in the browser. The authored axolotl answer is consistent with [San Diego Zoo's diet description](https://animals.sandiegozoo.org/animals/axolotl); the octopus answer follows [NHM's three-heart explanation](https://www.nhm.ac.uk/discover/octopuses-keep-surprising-us-here-are-eight-examples-how.html).

## What changed

- Explicit answer chain remains Nemotron 3 Super → Gemma 4 31B → Gemma 4 26B; one retry per model. No router, guard or classifier in that chain. Name/ID validation rejects guard/classifier families. `check:models` additionally checks live catalog existence, zero price, role descriptions and JSON response support; all three passed on 2026-10-07. Configuration remains swappable behind `BrainProvider`.
- Input safeguarding is a separate local deterministic step, before generation. No model-based safety call is enabled. The isolated reproduction diagnostic above is not application code or an answer-chain entry.
- Four-second model attempts inside a **14-second server budget**. The browser uses a **15-second shared transcription/answer budget**, aborts requests and has watchdogs for permission, listening, thinking, speaking and sleep transitions. A misbehaving adapter that ignores its signal cannot hold the response forever. Friendly retry states replace stuck thinking; deliberate idle/error/end screens can stay visible.
- OpenRouter 429/daily-limit failures stop after one failed provider attempt, without trying every other free model. A warm-process cooldown selects the curated 22-answer bank or the calm unknown-topic answer. Explicit `DEMO_MODE` uses the same bank. Quota/storage/origin/consent/pause guards remain enforced. Warm backoff is best effort, not a cross-instance persistent circuit breaker.
- `?debug=1` reveals status only inside the unlocked grown-ups panel: last model/error, Live model / Demo bank / Kind fallback, explicit DEMO_MODE use and audio status. No question/transcript/audio in debug state. Runtime logs contain only stage, model, status, code and latency; transcription logs each actual attempt separately.
- The first gated typed question waits only in memory, then automatically sends once after the grown-up unlocks and allows online questions. Pending mic use also resumes. Cancel, Sleep and page exit discard pending intent. The settings gate unlocks once per session; device consent remains remembered as before.
- Sending text or tapping the mic enables local read-aloud after that gesture, respecting an explicit mute. Voice loading waits briefly; missing, remote-only or throwing speech services degrade to captions without a load-time error. Speech and all transient work have ceilings and cancellation.
- Valsea retries transient failures once, with a six-second attempt ceiling and ten-second total ceiling. Auth/rate/credit/rejected audio does not retry; empty/low-confidence transcripts offer Type. The browser's overall fifteen-second turn still limits the combined path. No additional provider or recorded child audio was introduced.
- A real model again gave an incomplete green-leaf explanation. A narrow check now uses the corrected authored explanation when a green-leaf answer omits reflection or says leaves consume green light. This fixes the observed case; it is **not** general factual verification.

## Test results

`npm run build`, `npm run test:all`, `npm run test:backend`, `npm run check:models` passed locally. The full deterministic run included 29 unit tests at that run, all six activities through mistakes/completion/Done for now on three viewport sizes, offline/PWA/accessibility/cancellation checks, native recorder fixtures, and the Stage 5 gate/classifier/watchdog test. One later factual regression makes the backend total **20/20** (combined unit total 30). Final targeted backend, speech/cancellation and browser-recording tests passed after the small telemetry/speech-service exception fix. `CI=true npm run test:core` explicitly skipped live calls. GitHub runs the full deterministic suite on pushes; see PR checks for its current head.

### `npm run test:core` — real local keys

[Final machine-readable run](V3-STAGE-5-CORE.json), [first run](V3-STAGE-5-CORE-BEFORE.json). Only fixed authored test prompts/synthetic speech were sent; no actual child data. Loopback memory quotas and a temporary salt were scoped to the test process, with no deployed quota changes.

Final question checks: **10/10**, nine live answers from `nvidia/nemotron-3-super-120b-a12b:free`, one authored correction for green leaves. Median API latency **0.692s**, range **0.433–2.798s**. These checks assert the contract and selected expected concepts; they do not prove every claim scientifically.

| Question | Source | API latency |
| --- | --- | --- |
| What do axolotls eat? | Live model | 1.311s |
| Why do octopuses have three hearts? | Live model | 0.512s |
| Why is the sky blue? | Live model | 1.176s |
| How do plants grow? | Live model | 2.798s |
| Why do leaves look green? | Authored correction | 1.190s |
| How does rain form? | Live model | 0.450s |
| Why does the moon shine? | Live model | 0.516s |
| What do bees do? | Live model | 0.613s |
| Why should I wash my hands? | Live model | 0.770s |
| What is two plus three? | Live model | 0.433s |

Actual final axolotl answer: “Axolotls eat small worms and bugs. They also like tiny fish pieces.”

**Voice:** offline eSpeak NG 1.52 synthesized “What do axolotls eat?”; FFmpeg encoded WebM/Opus and MP4/AAC fixtures. No child's recording or external speech-generation service. Real Valsea recognized the question in WebM (**3.593s**) and MP4 (**5.180s**). Chromium then decoded the WAV into a silent-output stream and used its actual `MediaRecorder`, RMS silence stop, app upload, real Valsea transcription and real OpenRouter answer. Whole browser loop: **9.922s**, including recording/silence and the brief voice lookup. Answer captions appeared and microphone tracks were released.

The first WebM attempt timed out twice at the initial four-second ceiling and kindly offered Type in **8.019s**. MP4 succeeded in **2.947s**. The first native browser loop succeeded after one transcription retry in **13.989s**. These failures remain in the before report. The six-second allocation improved both formats in the final run without extending the shared fifteen-second turn.

**Audible read-aloud is unverified:** this headless Chromium exposes zero local voices. The app recorded `audio: unavailable` and kept captions; the real-provider script returned success for question/transcription handling, with `readAloudVerified: false`. Browser voice fixtures prove automatic dispatch after typed send, explicit mute, completion/cancellation and speech-service failure fallback; they cannot prove audible output on hardware.

### `npm run test:live -- <url>` — existing Netlify preview

PR #10 preview returned **404**; its PR had no Netlify preview check. The latest known reachable preview was [PR #9's existing preview](https://deploy-preview-9--pokelearnz.netlify.app/), which is older UI/backend code, not these fixes. No deployment was requested. [All ten outcomes](V3-STAGE-5-LIVE.json).

The ten-question audit completed and correctly returned **nonzero**: **0/10 pass the new contract**, **10/10 leave thinking gracefully**, **7 displayed answers**, **3 timeout/resting states** (axolotl, octopus, plants). Median time from submit/gate work to final UI state: **14.345s**, range **2.295–17.403s**; the first includes time solving the gate. The gate **did not auto-send** the first pending question; the script recorded this failure, manually submitted the same authored question and continued the remaining audit. The seven answers came from legacy `choices`, with no reliable live/demo source field. Model IDs were recorded where supplied. No classifier text appeared in this run. We have **not** verified the fixed branch on a deploy preview.

## Reproduce and remaining risks

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:all
npm run check:models
npm run test:core                     # ignored local .env keys; skips in CI
npm run test:live -- <existing-url>    # no hosting change; writes synthetic report
```

For manual real functions use the documented `netlify dev --offline --no-open`, or the lightweight loopback server with the example's memory quota configuration. Add `?debug=1` and unlock Grown-ups to inspect source/error/audio. Use `?mock=1` for offline UI work. The `.env.example` remains key-free.

Unverified/open risks: fixed-branch deployed behavior and Netlify execution/header/quota behavior; exact model/latency of the original published request; audible read-aloud on real devices; iOS Safari native recording (MP4 encoded format succeeded, not actual Safari hardware); children's accents/noise, SI/TA transcription and human-reviewed translations; adversarial/obfuscated safety and factual correctness beyond the narrow checks; provider retention/account policy, and free-model outages/limits. Warm cooldown is lost across instances/restarts. Abort stops waiting but cannot retract already received provider data. Regex moderation and the arithmetic consent gate are not comprehensive child protection. The previous safety-corpus findings remain open; no new full live adversarial audit was requested/run in Stage 5.

Commits: `6bdd717` (answer boundary, bounded turn, consent handoff and regressions), `1b17dac` (real/local/deployed testing tools and synthetic audio), followed by this final evidence/edge-case milestone. PR #10 remains draft and unmerged. No production deployment or provider/account configuration was changed.
