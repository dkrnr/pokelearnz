# Stage 3 Part B — backend hardening checkpoint

Branch `backend/hardening`, created from v3 Part A commit `a51fc89`. Part A remains independently on `redesign/kid-friendly-v3` (`53fded5`, `a51fc89`). Part B implementation milestones: `85df7b6`, `b44b482`; the final documentation checkpoint contains this file. No parent/main commits, force pushes, history rewrite, merge, deployment or Netlify settings/`netlify.toml` changes. Existing untracked handoff/research files are untouched. No key value was printed or committed; only blank `.env.example` is public.

## Result and live limitation

The server now owns the child prompt/input/output checks; client-supplied messages/personas are rejected. Provider requests have quotas, bounds, deadlines and deterministic stopping behavior. Existing child UI is preserved apart from friendly structured-error mapping and accurate grown-up disclosures. The unused sentiment endpoint is removed.

**Live OpenRouter generated answers are unavailable under the enforced privacy routing policy in this environment.** All three verified free model IDs returned HTTP 404 with privacy-policy endpoint errors, classified only as `PROVIDER_PRIVACY_UNAVAILABLE`. The chain stops with HTTP 200 `{code: RESTING, choices: …}` containing a kind deterministic pause; the UI shows its resting caption. We kept no-data-collection / zero-retention / zero-price requirements and did not change any provider account settings. Model existence does not prove an eligible endpoint exists. This is an open availability risk, not a successful live brain test.

**Live Valsea accepted both formats:** a synthetic WebM/Opus file and a fragmented MP4/AAC file sent with `audio/mp4` / an M4A filename both returned HTTP 200 and validated JSON transcripts. Runs took approximately 3.3–4.8s. The tone files contain no speech or child audio; nonempty transcripts from tones illustrate possible STT hallucination. Requesting verbose confidence and rejecting high no-speech probability / low log probability helps only when those fields are supplied. This does not verify recognition accuracy or physical Safari recordings. No returned transcript/answer or upstream diagnostic text was printed.

## Brain and child safeguards

Ordered models: `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-26b-a4b-it:free`. The old Ling ID no longer existed in the public catalog and was replaced. [Recorded check](model-check.json), reproducible `npm run check:models`: all three exist with zero listed input/output prices. No free-router or implicit model fallback. Each model has an 8s attempt deadline, one retry, then the next model; the chain has a 50s deadline. Permanent auth/credit failures stop immediately. Voice has a 12s provider deadline and sends only once. Client waits are bounded at 55s chat / 25s transcription; Stop/Sleep/activities abort requests and close tracks. Already uploaded data cannot be retracted by aborting.

OpenRouter requests have 96 output tokens maximum and routing flags `data_collection: deny`, `zdr: true`, `allow_fallbacks: false`, `require_parameters: true`, and zero maximum prompt/completion prices. A fixed server prompt names only a validated catalog buddy. Main's personality file remains available behind the swappable buddy module, but is not sent to the hardened backend. Caller questions remain untrusted content.

Input JSON is at most 8 KiB, question 2–300 characters, integer buddy 1–1025, with no extra fields/roles/histories/personas/control characters. Detected emails, phones, addresses, identifying phrases, sensitive subjects, injections and distress are withheld from providers. Distress receives three kind sentences pointing to a trusted grown-up; private/sensitive input gets a calm deterministic redirect. Detection is heuristic and multilingual coverage remains limited.

Generated output is at most 180 characters, three sentences, eight words per sentence, no questions/links/markdown/follow-up hooks. Sensitive/dangerous content, secrecy/dependency, guilt, reward/streak pressure, identifying information and known obfuscations are blocked. An approximate Flesch–Kincaid grade ceiling of 3.5 adds a reading check; it is unreliable on very short text/names and can reject harmless answers. English is requested by the prompt; the character check rejects non-Latin scripts but does not identify every language or Romanized harm. These filters are not complete moderation, factual grounding or a child-suitability certification. Blocked output receives a fixed trusted-grown-up redirect. No model output is returned wholesale.

## Abuse / cost / request privacy

Two function-export rate rules: chat 10 requests/minute, transcription 6 requests/minute, per IP/domain. Netlify documents two code rules on the free plan and delayed enforcement of up to 10s; no dashboard/settings rules were changed. These are supplemental to a strongly consistent Netlify Blobs quota, shared by chat/voice/retries: default **8 upstream attempts/IP/minute** and **200 upstream attempts/site/UTC-day**. Caps can be lowered by env; maximum configurable bounds are 30/minute and 1,000/day. Every retry reserves a slot before sending; failed requests consume their slot. Conditional `onlyIfNew` / `onlyIfMatch` writes prevent concurrent increments from overshooting. A private 32+ character salt is required; unavailable/corrupt counters or contention/timeouts fail closed. `PAUSE_AI=true` blocks all provider access. No paid moderation/authentication service is introduced; Valsea still uses the owner's existing account/credits, and Netlify usage can consume free-plan credits.

Only platform `context.ip` is used, never a caller-supplied forwarding header. Daily HMAC hashes and minute counts are stored in one daily quota record, alongside global counts. Old records are cleaned best effort on later activity, not by automatic TTL. Local memory mode is restricted to loopback and resets on restart; it is not the production quota guarantee. Netlify Dev's real local Blobs sandbox was exercised successfully by the live smoke.

POST requires an exact allowed Origin, compatible Fetch-Metadata and an explicit client consent assertion. Missing/cross-site origins and oversized/malformed requests are rejected. **Origin/consent headers and the arithmetic device gate are not authentication**; a non-browser caller can forge headers, drain quotas or create denial of service. Authenticated parent accounts/verified consent would change the requested UI/auth scope and remain open. Local `.env` and production origin/salt configuration are documented, not applied to remote settings.

Application telemetry has only `{code, latencyMs, model}`. Responses set `Cache-Control: no-store, private`, no-referrer and nosniff. Raw provider errors, request headers/bodies, questions, audio, transcripts, answers, IPs and keys never enter application logs. Diagnostic bodies are read only within a small bound to classify a fixed privacy failure; no text is returned/logged. Netlify/platform/provider logging and retention are not controlled by that guarantee.

## Voice / headers / local development

Multipart is parsed, field names/duplicates/model/language constrained, and rebuilt with a fixed filename and server-owned model/response format. File limit **2 MiB**, whole multipart limit 2 MiB + 8 KiB, server audio duration **45s**, browser ceiling **30s**. MIME and magic must match; audio-only WebM/Opus, MP4/AAC and Ogg formats are validated. Bounded EBML timestamps/Opus packet durations and MP4 sample/fragment durations are checked alongside `music-metadata`; unknown/laced/malformed files fall back to Type. Caller duration/filename claims are not trusted. Audio parsers are extra attack surface and have not been fuzzed across all possible media variants.

Synthetic WebM and normal/fragmented MP4 fixtures pass validation. Actual Chromium MediaRecorder WebM bytes from a synthetic stream also pass server validation; mic tracks stop on activity opening and no upload follows cancellation. Valsea's documented WEBM/M4A support matches the live synthetic requests. Physical iOS Safari/Android formats and recognition remain unverified. Transcripts are string/length/private/sensitive/confidence checked before chat; no transcript-confirmation screen was added in this UI-limited pass.

`_headers`: CSP allows self scripts/fonts/shell/API, only jsDelivr images/connect, self/blob media, no frames/objects, `frame-ancestors none`, `base-uri none`; microphone self-only, camera/geolocation disabled, no-referrer, nosniff, X-Frame-Options DENY. `style-src 'unsafe-inline'` remains necessary for the virtual grid and procedural animation's bounded inline styles; script inline/eval are blocked. API requests use same-origin functions, so browser CSP does not need direct OpenRouter/Valsea access. CSP was enforced in normal browser tests, with inline script injection explicitly blocked. Only axe's test fixture bypasses CSP for its injected scanner.

`netlify dev --offline --no-open` runs real functions and local Blobs without linking/deploying or fetching remote settings. Local functions expose `/api/chat`, `/api/transcribe`, `/api/health` and conventional function paths. Health reports only two key-presence booleans, not validity/availability. The lightweight server mirrors these handlers and headers. `netlify functions:build --src netlify/functions --functions /tmp/pokelearn-stage3-functions` passed; the public build excludes private/server files. [README](../../README.md), [blank env example](../../.env.example), [privacy disclosure](../../PRIVACY.md) now match these facts.

## Every Stage 2 finding

| Original finding | Change | Remaining limit |
| --- | --- | --- |
| 1 Server child prompt absent | Fixed server-owned prompt; no caller roles/persona | Model compliance still requires output checks |
| 2 No moderation | Input/output category/PII/hooks/reading checks and corpus | Regex misses euphemisms/multilingual harms; false positives |
| 3 Free-router / unknown routing | Explicit verified free IDs and privacy/price flags | No eligible private endpoints observed; host/region/policy not audited |
| 4 Unbounded messages | Question/ID-only schema, body/text caps | Unrecognized private text can still pass |
| 5 Unbounded output | Tokens, provider body and child-answer caps | Limits do not prove truth |
| 6 Unvetted persona | Only catalog identity + fixed teacher instructions | Personality nuance is reduced |
| 7 Question disclosure | Detected PII withheld, no-history request, privacy flags | Hidden identifiers/provider policies remain open |
| 8 Raw child voice disclosure | Accurate disclosure, consent assertion, bounds | Can't redact/erase audio before/after Valsea with this flow |
| 9 Only content-type validation | Parse multipart, sniff media, derive duration, fixed model/language | Real variants/fuzzing still needed |
| 10 Transcript unchecked | Length/PII/safety/confidence checks | Hallucination and no human confirmation remain |
| 11 Binary forwarding | Modern Request parsing/rebuilt upload; live WebM/M4A success | Physical Safari/Android not verified |
| 12 Sentiment endpoint | Deleted; 404 in Netlify Dev | Older production remains unchanged until separately approved deployment |
| 13 No abuse/consent/auth | Free-plan code limits + atomic shared quotas, origin, consent assertion, kill switch | Not authenticated parental consent; spoofing/DoS remains |
| 14 No deadlines/cancel | Per-attempt/chain deadlines and signals | Cannot prove remote processing stops on client cancellation |
| 15 Duplicate uploads | Voice once; chat retries bounded/count toward quota | Chat may be transmitted again; no provider idempotency guarantee |
| 16 Uncaught failures | Caught and mapped to fixed friendly codes | Platform-level failures remain possible |
| 17 Raw diagnostics | Fixed error enums and limited telemetry only | Platform/provider logs outside app control |
| 18 Privacy headers absent | No-store/private API headers, CSP/permissions/referrer/nosniff | Hosting/proxy behavior in production not verified |
| 19 Loose schemas | JSON/message/transcript/media checks | Provider behavior/metadata can still vary |
| 20 No safeguarding/factual grounding | Kind distress redirect, sensitive/danger checks, admit-uncertainty prompt | Human safeguarding review and factual/clinical validation remain |

## Tests / evidence / stopping point

- `npm run build`, `npm test`: ten retained/extended content/server/privacy/cache checks pass.
- `npm run test:backend`: **12 tests** pass; corpus includes **32 adversarial inputs**, **47 blocked outputs**, **5 allowed answers**. Providers are mocked; tests cover PII/injection/distress, pressure/unsafe/reading output, malformed/oversize requests, ordered retry/timeouts/cancellation, permanent failures, missing-key/origin/consent/pause behavior, 40 concurrent quota reservations with no overshoot, daily/window rotation, media/size/duration validation, once-only voice, transcript confidence and log/header/health schemas.
- `npm run check:models`: all three current explicit IDs exist and are listed free; the stale Ling ID was discovered/replaced. Model availability is temporal, not guaranteed.
- `npm run test:ui`, `tests/v3-voice.mjs`, `npm run test:pwa`: pass against real Netlify Dev with mock child/provider fixtures. All six lessons include a wrong answer and Done for now at all three sizes, WCAG scans, inactive mic during lessons, only Wake on Sleep, no automatic voice/provider calls, offline/cache/privacy, late cancellation, draft languages, three-sentence stable captions and waiting-SW lifecycle.
- Real local health/safeguarding/origin rejection/removed-sentiment routes and enforced CSP tested without bypass. Four mapped states captured: [resting](screens/v3-stage3-b/phone-resting.png), [offline](screens/v3-stage3-b/phone-offline.png), [rate-limited](screens/v3-stage3-b/phone-rate-limited.png), [type instead](screens/v3-stage3-b/phone-type-instead.png).
- Live smoke intentionally exits nonzero: chat returns RESTING because private endpoints are unavailable; both voice format checks pass. No successful live generated child answer is claimed. No real child voice was used, no keys/diagnostics printed.
- Part A [phone](screens/v3-stage3-a/phone-normal-scene.png), [portrait](screens/v3-stage3-a/tablet-portrait-normal-scene.png), [landscape](screens/v3-stage3-a/tablet-landscape-normal-scene.png), chooser/Sleep/six reactions and performance evidence remain in [its report](V3-STAGE-3-A.md). Stage 2 LCP 1.070s → Part A 1.237s, moving-ready 1.737s, CLS 0, scroll tasks >100ms 0. Backend dependencies are excluded from the public bundle.

Not verified: deployed Netlify rule/quota/header enforcement and cross-region concurrency, authenticated consent, all media fuzz cases, physical phone/tablet performance/permissions, actual Safari/Android recordings, reliable speech recognition from children, OpenRouter child-answer quality (no eligible private endpoint), actual downstream identity/region/retention/deletion, comprehensive multilingual safeguarding, human SI/TA review, virtual-list screen-reader usability, and reviewed production authored recordings. Free-plan quotas/usage and policies can change; the code cannot certify safe unsupervised use. No further stage or deployment performed; stopped after this report.

## Primary documentation used

[Netlify free-plan code rate rules / enforcement timing](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Blobs strong reads and conditional writes](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [Functions API/routing](https://docs.netlify.com/build/functions/api/), [60s execution / payload bounds](https://docs.netlify.com/build/functions/configuration/), [Valsea supported upload formats](https://valsea.ai/docs/quickstart), [OpenRouter privacy/price routing](https://openrouter.ai/docs/guides/routing/provider-selection). Public docs were read using agent-reach's web-reader workflow; no GitHub CLI was used.

[Compare Part A](https://github.com/dkrnr/pokelearn/compare/redesign/kid-friendly-v2...redesign/kid-friendly-v3) · [Compare Part B only](https://github.com/dkrnr/pokelearn/compare/redesign/kid-friendly-v3...backend/hardening).
