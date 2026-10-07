# Stage 6 release readiness

Date: 2026-10-07. Active repository: `dkrnr/pokelearnz`; branch: `feat/release-readiness`. This work follows the original redesign and identity/migration work. The original PR #9 is a closed archive issue in the recreated repository; native PR #23 carries the guard/migration checkpoint. The release branch includes those safeguards from main without merging either PR.

## Result

The server uses local small talk, a 95-answer authored bank, a selective validated answer cache, optional Groq and OpenRouter free adapters, and readable fallbacks. Forced `?demo=1` avoids chat-model calls and is marked inside grown-up settings; voice still uses Valsea if enabled. OpenRouter account-wide daily exhaustion is remembered until the next UTC day rather than retried across free models. Missing provider keys are skipped.

The build emits `/about`, `/parents`, `/privacy` and `/contact` without a new framework. Pages disclose audio/text providers, free-model prompt policies, actual device/server storage, lazy cache deletion, heuristic safety limits and university-demo status. Footer and grown-up links, unique titles/descriptions, canonical production URLs, Open Graph/Twitter metadata, a Playwright social screenshot, robots, sitemap, family-friendly JSON-LD, language and semantic headings are present. The main page has readable no-JS content.

The portfolio README has actual Playwright screenshots, a Mermaid diagram, audience/problem, decisions, testing, limitations, local setup, CI badge and report links. `ARCHITECTURE.md`, `DECISIONS.md` and the full session handoff describe the system and migration honestly.

## Deterministic evidence

The final minified build passed all 47 then-existing unit tests and the complete browser suite: origins, safety, small talk, model contract, all bank answers, cache expiry/cap, persistent UTC quota reset, gate auto-send, chooser, six activities, voice fixtures, cancellation, axe accessibility, offline PWA and delayed service-worker update. One additional live-result regression passed independently, for 48 unit checks total. The new three-question live harness is tested with browser fixtures without provider calls. Four information pages pass no-JS/SEO checks and axe scans.

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

Pending the release PR's automatic Netlify preview. One live run will send at most three synthetic questions, report actual Groq/cache answers separately from valid HTTP-200 `DAILY_LIMIT` / `PROVIDER_UNAVAILABLE` fallbacks, and collect response headers plus CSP events during scene, chooser, activity and typing. No manual deployment or settings change is performed. This section will be updated with the actual result; pending checks are not passed checks.

## Remaining boundaries

Real Valsea recognition and physical iOS/Android devices are not checked in this release. No real child study, verified parental-consent system, multilingual safety review, provider-account privacy audit, public child-service terms review or legal permission for fan assets is claimed. Groq adds independent capacity but also has limits. Cache PII screening and output checks are heuristics; cached model facts can be wrong. Dormant cache records can outlive the 30-day serving TTL. Clear device data does not delete remote records. Contributor invitations, historical-key revocation if still active, old-repository deletion and any GitHub Support purge request remain owner actions.
