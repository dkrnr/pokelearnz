# Decisions and trade-offs

## Voice with an equal typing path

The project explores spoken questions for ages 6–9, while captions and typing avoid making microphone access or speech recognition mandatory. Recording requires opted-in settings, a user gesture and browser permission. The arithmetic settings gate cannot establish parental identity. Background speech may leave the device before any text screening. Valsea's age terms and real-device behavior need review before child use.

## Vanilla static app and generated information pages

The scene has a small state machine, a local catalogue and finite activity data. A new framework would add migration and runtime cost without resolving the current questions. Node build scripts generate readable static pages and SEO metadata. Sources remain readable; emitted assets are minified. Offline assets are public content, not a conversation database.

## Provider adapters and independent capacity

OpenRouter free models share account-wide capacity; switching between free models cannot recover a daily quota. Groq adds a separate optional route through the same answer contract. Missing keys are skipped. Model catalogs are checked explicitly without inference, since model availability and compatibility can change. The normal chain is cache → bank → Groq → OpenRouter → fallback. Authored small talk and forced demo are handled earlier.

Limits still exist: Groq and model hosts have their own quotas, failures and policies. App quota reservations apply to every model attempt, with bounded retries/deadlines. OpenRouter daily exhaustion is recorded to the next UTC day; storage problems can prevent persistence. No provider setting or quota is altered by this feature.

## Authored bank and a selective shared answer cache

Ninety-five short answers cover common animal, space, body, weather, plant and fictional Pokémon questions. Matching requires exact questions or conservative keyword combinations. It is deterministic and avoids a model call, but is less flexible and can choose the wrong topic. Every answer passes the same output checks in tests; passing checks does not constitute scientific review.

The shared cache reduces repeated inference. Only output-validated, PII-screened general-science answers qualify. Raw questions are replaced with salted HMAC keys, and arbitrary personal contexts are excluded through a restricted vocabulary. A small 256-entry / 256-KiB cap and 24-hour serving TTL constrain storage. Cleanup on later activity avoids a scheduled job, but cannot promise automatic physical deletion on 24 hours. Model answers remain unverified after caching. A version change invalidates all answers; legacy 30-day records are never read by v2. Short or hedged answers are not cached. [Cache runbook](docs/CACHE.md) covers targeted purging without resetting quota state. Provider policies and this compromise are disclosed.

## Restrictive answer checks and friendly recovery

Short sentence limits suit the intended age range and help prevent raw classifier output reaching captions. Input/output rules detect selected unsafe or private content; some factual checks cover known errors. These heuristics have false positives and false negatives, and do not establish comprehensive safety or factual accuracy. A named blocked-output rule explains rejection in tests; one strict retry can recover harmless questions. Authored greetings allow one narrow friendly question without model calls or conversation pressure.

## Anti-addiction interaction design

Each activity has an explicit end. Sleep and Done for now provide calm stopping points. The design excludes streaks, points, scarcity, ads, notifications, automatic speech and endless conversational prompts. These are deliberate interaction choices; their effect on children has not been measured. Reduced motion and large targets are tested automatically, but do not replace usability sessions.

## Honest privacy and portfolio evidence

The public pages distinguish audio to Valsea, text to configured AI providers, server answer/quota records and device choices. Free providers may retain or train on questions. Account privacy controls were not inspected or changed. Clear device data does not delete remote records or retract prior uploads. This remains a university demo with no personal information permitted from children.

Playwright screenshots show the actual mock scene. Automated unit, browser, accessibility, PWA and core-loop checks provide evidence with boundaries: fixtures are not live recognition, a local Lighthouse score is not production latency, and a graceful HTTP-200 quota fallback is not a fresh AI answer. [Release evidence](docs/redesign/STAGE-6-RELEASE.md) records those distinctions.

## Repository identity and continuity

The recreated `dkrnr/pokelearnz` repository preserves other contributors' attribution. History needed targeted owner identity correction and removal of one historical credential; commit hashes changed. Native PR review/check history cannot be recreated, so archive issues retain available text. Repo-local hooks and a contributor allowlist CI workflow prevent recurrence. Old GitHub and local recovery copies remain until the owner accepts migration and coordinates collaborators. [Handoff](docs/HANDOFF.md) records recovery boundaries without private audit values.
