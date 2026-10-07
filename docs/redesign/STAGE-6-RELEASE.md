# Stage 6 release readiness

Date: 2026-10-07. Active repository: `dkrnr/pokelearnz`; branch: `feat/release-readiness`. This work follows the original redesign and identity/migration work. The original PR #9 is a closed archive issue in the recreated repository; native PR #23 carries the guard/migration checkpoint. The release branch includes those safeguards from main without merging either PR.

## Result

The server uses local small talk, a 95-answer authored bank, a selective validated answer cache, optional Groq and OpenRouter free adapters, and readable fallbacks. Forced `?demo=1` avoids chat-model calls and is marked inside grown-up settings; voice still uses Valsea if enabled. OpenRouter account-wide daily exhaustion is remembered until the next UTC day rather than retried across free models. Missing provider keys are skipped.

The build emits `/about`, `/parents`, `/privacy` and `/contact` without a new framework. Pages disclose audio/text providers, free-model prompt policies, actual device/server storage, lazy cache deletion, heuristic safety limits and university-demo status. Footer and grown-up links, unique titles/descriptions, canonical production URLs, Open Graph/Twitter metadata, a Playwright social screenshot, robots, sitemap, family-friendly JSON-LD, language and semantic headings are present. The main page has readable no-JS content.

The portfolio README has actual Playwright screenshots, a Mermaid diagram, audience/problem, decisions, testing, limitations, local setup, CI badge and report links. `ARCHITECTURE.md`, `DECISIONS.md` and the full session handoff describe the system and migration honestly.

## Deterministic evidence

The minified build before the live run passed 47 unit tests and the complete browser suite: origins, safety, small talk, model contract, all bank answers, cache expiry/cap, persistent UTC quota reset, gate auto-send, chooser, six activities, voice fixtures, cancellation, axe accessibility, offline PWA and delayed service-worker update. After the observed live findings, all 50 unit checks passed, including the added live-rubric and quasar/cache regressions. The full post-fix browser suite also passed, including the three-question browser fixture, accessibility and PWA flows. The new three-question live harness is tested with browser fixtures without provider calls. Four information pages pass no-JS/SEO checks and axe scans.

Model catalogs were checked without inference. The configured OpenRouter free models and Groq `openai/gpt-oss-20b` were available in their catalog responses. Catalog presence is not a completed model answer or a guarantee of future availability.

## Mobile Lighthouse

Lighthouse 13.5.0, minified local production build, simulated mobile, 2026-10-07:

| Page | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 94 | 100 | 100 | 100 |
| `/parents` | 100 | 100 | 100 | 100 |

Source and generated HTML are separate; the final audits ran against the generated build. Easy failures fixed: output minification and the buddy button's visible/accessibility label. Full local HTML/JSON reports are ignored at `qa/artifacts/lighthouse/`; a compact sanitized summary is committed alongside this report.

Remaining scene diagnostics include about 17 KiB unused CSS, blocking stylesheet/font dependencies, cache lifetimes and LCP about 2.9 seconds. The local test server has no compression, contributing document-latency diagnostics. Parents reports blocking font/CSS and main-thread/JS diagnostics despite no application scripts on that page; these diagnostic items need trace-level review, not a claim of parent-page script work. Scores are lab results, not real-user or production speed.

## Deployed evidence

[Release PR #24](https://github.com/dkrnr/pokelearnz/pull/24) produced the automatic preview at `https://deploy-preview-24--pokelearnz.netlify.app/`, exact commit `e6894767ee45e21f8d5b1ea3526b5b63c4bc71b3`. The single live run sent three synthetic questions:

| Question | HTTP / code | Route | Latency | Result |
|---|---|---|---:|---|
| What do axolotls eat? | 200 / OK | Authored, model none | 1,392 ms | Correct bank answer; gate auto-sent once |
| What is a quasar? | 200 / OK | Groq, openai/gpt-oss-20b | 1,188 ms | Real model answer, but incorrectly called it a star |
| Same quasar question | 200 / OK | Cache, same Groq answer | 534 ms | Cache hit verified; repeated the same factual error |

No `DAILY_LIMIT`, `PROVIDER_UNAVAILABLE`, missing-key or connection error occurred. Health reported Groq/OpenRouter/Valsea present. This proves routing and independent Groq capacity, **not factual correctness**. The original keyword rubric was too loose; the committed [live evidence](STAGE-6-LIVE.json) records the later factual review explicitly. The overall run failed its CSP gate, and the inaccurate answers also fail factual review.

All expected response headers were present: CSP, HSTS (one year, includeSubDomains/preload), no-sniff, DENY framing, no-referrer and restrictive microphone/camera/geolocation permissions. Scene, chooser, typing and Blocks activity completed with no runtime or network errors. One CSP issue appeared in both console and DOM event reports: Netlify's injected dashboard toolbar iframe was blocked by `frame-src 'none'`.

The targeted `_headers` fix permits only `https://app.netlify.com` as an embedded frame; the app still denies being framed, scripts remain self-only and no new wildcard is added. A named `FACT_QUASAR_AS_STAR` output rule rejects the observed misconception and invalidates it during cached-entry reads; prompt guidance and a strict-retry/cache regression cover recovery locally. The live rubric now checks output policy as well as transport shape. The policy is still not a general fact checker.

A rebuilt-preview, zero-question CSP/header check is pending. No second live question run will be performed; a fresh corrected Groq answer is therefore unverified. Initial PR #24 CI and identity checks passed at the tested live commit; final head checks will be recorded separately.

## Remaining boundaries

Real Valsea recognition and physical iOS/Android devices are not checked in this release. No real child study, verified parental-consent system, multilingual safety review, provider-account privacy audit, public child-service terms review or legal permission for fan assets is claimed. Groq adds independent capacity but also has limits. Cache PII screening and output checks are heuristics; cached model facts can be wrong. Dormant cache records can outlive the 30-day serving TTL. Clear device data does not delete remote records. Contributor invitations, historical-key revocation if still active, old-repository deletion and any GitHub Support purge request remain owner actions.
