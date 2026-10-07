# Session handoff: PokeLearn migration and release readiness

This is the sanitized project memory for a new Codex/orchestrator session. Read this file before continuing. Raw identity audits and recovery mirrors are private, outside the repository; do not copy their contents into GitHub or committed documentation.

## Start here

- Active checkout: `/performance/projects/dkrnr/pokelearnz`.
- Active GitHub repository: [dkrnr/pokelearnz](https://github.com/dkrnr/pokelearnz), public.
- Remote uses the existing account alias `git@github-dkrnr:dkrnr/pokelearnz.git`. It reaches the same repository as the owner's standard SSH URL. No SSH/global Git configuration was changed.
- Current development branch: `feat/answer-quality-demo`, created from main after PR #24 merged at `ab6d1bd` on 7 October 2026. Stage 7 is [PR #25](https://github.com/dkrnr/pokelearnz/pull/25). PR #24 included PR #23's identity/migration safeguards; main remains the production branch.
- Repo-local identity: `Dunith Kerner <250664980+dkrnr@users.noreply.github.com>`, `user.useConfigOnly=true`, `core.hooksPath=.githooks`. The owner approved the GitHub noreply identity. Preserve approved contributor identities.
- `.env` was transferred by the owner, remains ignored and unmodified. Do not read keys into output or stage it. Local notes `LEARNINGS.md`, `SOL-HANDOFF.md`, `STUDIO.md` and `research/` remain untracked owner material.

```sh
cd /performance/projects/dkrnr/pokelearnz
git fetch
git status --short
gh api user --jq .login
python3 scripts/check-identities.py --local
npm ci
npm run build
npm run test:all
```

Confirm the active account is `dkrnr`. Inspect current PRs before choosing the next branch; do not assume original PR numbers still represent native PRs. Do not work in or push from the old recovery checkout.

## Session history and repository migration

1. The initial Stage 6 work fixed strict same-site origin handling for production, localhost and this Netlify site's preview/branch hosts, and tested the pending typed question sending exactly once after the grown-up gate. Authored small talk replaced model-based greetings; named output rules, a single strict retry and friendlier fallback addressed blocked harmless output. Unit/browser checks passed. The original ten-question live run was 8/10; account-wide OpenRouter daily exhaustion stopped the remaining Stage 6 work. The owner subsequently merged original PR #9 into main.
2. An urgent identity audit interrupted feature work. GitHub authentication was verified as `dkrnr`; full local/remote mirrors, exports and raw audits were saved outside the repo. The original remote audit found 32 commits with the unwanted author identity and 32 with it as committer. Actual affected dates were October 6–7. Historical owner variants, seven contributor commits and GitHub merge attribution were preserved. Working tree/history/messages/trailers/tags/PR/issue text and 24 available CI log archives were checked; no actual unwanted identity strings were found in published content outside commit metadata. Four ignored encoded Lighthouse artifacts had incidental matches.
3. The owner selected targeted rewrite and recreation, then created the new public repository as `pokelearnz`. The old GitHub repository was retained for confidence checks and collaborator coordination. No old branches were force-pushed or merged.
4. GitHub push protection found one historical OpenAI-style credential in `config.js`. Publication stopped, then a generic in-memory redaction removed credential-shaped bytes from rewritten history without printing/publishing the key or disabling protection. Only the historical key bytes changed in file content, but descendant hashes changed, including contributor commit hashes. Other contributors' names, emails, dates and non-secret changes remain intact. Revocation of that historical key is not independently verified.
5. The final clean baseline was published by ordinary push: nine branches, one tag and 67 reachable commits at publication. Restored metadata included 17 labels, two milestones, 12 open issues, ten closed PR archive issues numbered #1–#10, 12 issue comments, release `v0.67` (named `mvp`), repository topics/settings, Actions/security configuration and the effective main branch protection. The original strict required CI check and existing protection choices were preserved.
6. Native original PRs/reviews/events, immutable API author/time fields, stars/forks and past Actions runs cannot be recreated. Available attribution and dates remain in imported text. The two collaborator invitations were not sent; the owner will coordinate them.
7. Native [PR #23](https://github.com/dkrnr/pokelearnz/pull/23) adds repo-local identity safeguards and the migration checkpoint. Hooks reject an incorrect effective owner identity and unapproved author/committer emails. PR CI checks an explicit contributor allowlist. No committed mailmap or global configuration changes were used. Suggested manual includeIf/useConfigOnly setup and GitHub Support request text are outside the repo.
8. The new checkout was created and local material migrated: 1,189 files, about 221.5 MB, including owner notes/research and ignored QA artifacts. Dependencies and build output were regenerated. The owner's `.env` was preserved. Old generated Netlify runtime/database caches were retained only in the recovery checkout. Migration deterministic tests passed (40 unit tests plus browser/accessibility/PWA/voice fixtures).
9. The owner relinked the existing Netlify project to `dkrnr/pokelearnz`. Read-only API checks confirmed production branch main, build `npm run build`, publish `dist` and functions `netlify/functions`. Automatic production and PR #23 preview builds were ready at their expected commits. One production axolotl question verified a valid HTTP-200 authored fallback with `DAILY_LIMIT`, gate auto-send, scene/chooser/activity and no CSP/runtime errors. Later authored-greeting/preview health probes failed with `ERR_CONNECTION_CLOSED`/TLS before any question; fresh model and preview voice were not claimed.
10. The owner added Groq credentials locally and in Netlify and requested the final release-readiness prompt. The old backend did not yet use Groq, so the release branch implemented the actual adapter, cache, 95-answer bank, forced demo mode, UTC quota status and Stage 6 pages/SEO/portfolio evidence. See the current [release report](redesign/STAGE-6-RELEASE.md) for exact tests, final preview result and open limits.

## Recovery copies and audit boundary

Private recovery root: `/home/dkrnr/backups/pokelearn-20261007-o2wzyg07`. Original mirrors and exports remain there. `secret-clean.git` is the sanitized publication baseline; original/intermediate mirrors may contain the old identity and historical credential. **Do not publish any recovery mirror wholesale.** External restoration/migration summaries and manual configuration/support-request text describe the original audit and restoration. New release commits are on GitHub and the active checkout; baseline mirrors predate release readiness.

The old local checkout `/performance/projects/dkrnr/pokelearn` and old GitHub repository remain recovery copies. Do not copy or merge their `.git` history back. Deleting the old repository is an owner decision after checking access, Netlify, backups and collaborator communication. Deletion does not promise removal of independent forks, provider logs or GitHub caches; use the prepared Support request if needed.

## Current architecture and verification

Read [README](../README.md), [ARCHITECTURE](../ARCHITECTURE.md), [DECISIONS](../DECISIONS.md), [PRIVACY](../PRIVACY.md) and [release evidence](redesign/STAGE-6-RELEASE.md). Normal routing is cache → authored bank → optional Groq → OpenRouter → a kind fallback. Authored small talk/forced demo happen earlier. Cache stores validated, PII-screened answers with HMAC keys, not raw question text; Stage 7 changes serving to a 24-hour TTL with lazy cleanup, a versioned v2 namespace and short/uncertain-answer exclusion; see [cache runbook](CACHE.md). Cached model answers are unverified. Hosted quotas use Netlify Blobs CAS. All providers have independent limits; switching OpenRouter free models does not add daily account capacity.

Deterministic tests exclude live keys. Model catalog checks do not infer. `npm run lighthouse` audits the generated main/parents pages with mobile simulation. `npm run test:live -- <preview-url>` is capped at three synthetic questions and explicitly distinguishes quota fallback from model/cache success. One live check per session; do not repeat a failed remote run without a new user instruction. Voice fixtures do not verify actual Valsea recognition.

## Standing constraints and remaining owner actions

Small commits, status/secrets checks before each commit, push each milestone. No force-push, merge, manual deploy or Netlify settings changes. Never publish the private identity's values in files, PRs, issues, messages or reports. Keep raw identity output outside Git. Do not change global/other-repo Git or SSH config. Do not invite/message collaborators without explicit authorization.

The owner still needs to review Stage 7 PR #25 and the overlapping guard PR #23, coordinate/invite two collaborators, revoke the historical key if not already revoked, decide when to delete the old repository, and request GitHub cache/old-PR purge if desired. Public child-service launch remains blocked on provider age terms/consent, human language/safety/usability review, physical-device voice checks and fan-asset permissions. These are stated limitations, not completed tests.

## Final release checkpoint

Native [PR #24](https://github.com/dkrnr/pokelearnz/pull/24) targets main and includes PR #23's safeguards. The release preview is `https://deploy-preview-24--pokelearnz.netlify.app/`. Initial CI/identity/build checks passed. The one three-question live run verified authored → Groq → cache and gate auto-send; all keys were present and no quota/connection error occurred. It also exposed one Netlify toolbar CSP frame conflict and a real factual error (quasar described as a star, then cached). The overall live gate did not pass. Targeted CSP/output/cache/rubric fixes and offline regressions follow; no further questions are sent this session. Corrected live model accuracy remains unverified. See [the release report](redesign/STAGE-6-RELEASE.md) and [reviewed live evidence](redesign/STAGE-6-LIVE.json). The post-fix preview at `712d5162e8d240670fe150585fd7f208323c2ae9` passed the zero-question CSP/header check across all four views, with no CSP/runtime errors. The complete local suite passed 50 unit tests and all browser/accessibility/PWA flows. Local mobile Lighthouse scores are scene 94/100/100/100 and parents 100/100/100/100; the final deployed audit scores are scene 86/100/96/69 and parents 82/100/96/66. The preview has platform noindex and a toolbar cookie warning; actual details and remaining performance findings are in the release report. Full GitHub CI and identity checks passed on implementation commit `712d5162e8d240670fe150585fd7f208323c2ae9`; use PR #24 for the final documentation follow-up status.


## Stage 7 checkpoint

Read [Stage 7 report](redesign/STAGE-7-REPORT.md), [all 20 local Groq answers](redesign/STAGE-7-GROQ.json), [catalog](redesign/STAGE-7-MODELS.json), [demo walkthrough](DEMO.md), [cache operations](CACHE.md) and [credential rotation](CREDENTIAL-ROTATION.md).

- Default Groq order is GPT-OSS 120B then 20B. Explicit environment overrides still win; no local `.env` or Netlify settings were modified. Prompt requests complete grammatical sentences for ages 6–9 and “I'm not sure” on uncertainty. The local comparison returned 10/10 per model: original output passes 9/10 vs 3/10, median 1.31s vs 1.02s. Keyword scores masked factual mistakes. Final ice-error rejection leaves 8/10 vs 3/10 saved outputs valid; factual accuracy remains unverified.
- A 24-hour v2 answer cache ignores all legacy v1 entries. `CACHE_VERSION` invalidates serving; short/hedged answers are excluded. Purge script/runbook preserve quotas and default to dry run. No hosted purge was executed.
- All public pages were reviewed locally, developer prose was simplified, the specific hosting review iframe is hidden by CSS, and a small AI accuracy note sits by captions. Hiding the iframe does not stop its network load. The quoted Collaborate section was absent from repository source.
- A local Playwright-recorded 18-second authored-bank GIF is in the README. It is synthetic interaction evidence, not live inference or the grown-up gate. `docs/DEMO.md` covers a three-minute employer walkthrough.
- Historical credential type is an OpenAI-style API secret key; rotation steps are documented without values. Revocation remains an owner verification, and private recovery copies must stay private.
- Build and full local regressions passed (57 unit tests plus browser/accessibility/PWA/voice fixtures). A CDN-dependent motion test now uses a bundled decode fixture; live sprite delivery is not claimed. GitHub identity and automatic preview/header checks passed at `58aafda`; final GitHub status is on PR #25.
- The one deployed live check failed with `ERR_CONNECTION_CLOSED` before navigation, **zero questions sent**. No retry was run. Fresh deployed model/cache/gate, headers/CSP and public-page cleanup are unverified. The separate local 20-call Groq comparison was explicitly authorized.

Continue only in dkrnr/pokelearnz, with small commits, identity hooks and staged-secret checks. No force-push, merge, manual deployment or Netlify settings change. The one-check budget is spent for this session even though navigation failed. Existing ignored/local owner material remains untouched.
