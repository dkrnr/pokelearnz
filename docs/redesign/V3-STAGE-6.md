# Stage 6 — origin hotfix and blocked live validation

Checked 2026-10-07. Work is on `redesign/kid-friendly-v3` for [PR #9](https://github.com/dkrnr/pokelearn/pull/9). [PR #10](https://github.com/dkrnr/pokelearn/pull/10) was confirmed merged into this branch at `9f640af45da017fa9af8b6134937018939ba15ec`. `git fetch`, repository-root and GitHub authentication checks passed after granting the tools access outside the sandbox. The initial sandbox failures were environmental, not an invalid GitHub login.

## Changes

The shared origin guard previously depended on exact `URL`/`DEPLOY_PRIME_URL` runtime environment values or an allowlist defaulting to production. Netlify build variables are not guaranteed to reach functions. The hotfix now accepts HTTPS production and strictly matched preview/branch hosts under this site's namespace (`pokelearnz.netlify.app`), plus same-origin loopback development. Netlify's own URL variables are accepted only within that namespace. It rejects other sites, host suffix lookalikes, insecure public origins, credentials, paths, queries and unexpected ports. Cross-site-fetch and consent checks remain enforced. Arbitrary `ALLOWED_ORIGINS` overrides were removed and the blank example/documentation updated.

Origin unit tests cover the allowed and rejected cases and are included in the CI regression runner. No function handler files were changed; only the shared origin helper changed in backend code.

The pending typed-question behavior already existed in the merged code. The Stage 5 browser regression passed: no submission before consent, then exactly one submission carrying the original question after solving the grown-up check and enabling online questions. No app fix was necessary. The live runner now measures the actual request count for gate auto-send and no longer manually resubmits a failed pending question.

Hotfix milestone: `a8ed4ba` (pushed). Existing Netlify integration automatically rebuilt PR #9 successfully. No merge, force-push, manual deploy or Netlify settings change was performed.

## Real live results

Command: `LIVE_REPORT=docs/redesign/V3-STAGE-6-LIVE.json npm run test:live -- https://deploy-preview-9--pokelearnz.netlify.app/`

The rebuilt preview was tested with exactly **10 synthetic questions**, no prompt retries or extra provider probes. Exit code **1**. **0/10 passed**; all returned **HTTP 503, code RESTING**, and all left thinking gracefully. Gate auto-send **passed**. Median end-to-end latency was **534 ms**, range **412–1,463 ms** (first includes solving setup). Full per-question results: [live JSON](V3-STAGE-6-LIVE.json).

The origin blocker is resolved in this run: requests no longer return FORBIDDEN. Answers are still blocked by deployment configuration. A read-only Netlify CLI inspection of the `pokelearnz` deploy-preview context and functions scope found:

- OpenRouter and Valsea keys present (also confirmed by the boolean-only health endpoint).
- `RATE_LIMIT_SALT` absent; therefore it does not meet the 32-character minimum required by the quota guard.
- `PAUSE_AI` not enabled; daily cap not explicitly configured (default applies).

No secret values were printed, edited or committed. `reserve()` explicitly fails closed with RESTING when the salt is missing or too short. This missing setting is a confirmed blocker; after it is corrected, Blobs access, quota availability and provider answers still need a new bounded live check. We did not bypass quotas or enable demo mode to manufacture a pass.

Resolution requires the maintainer to set a private, stable, random `RATE_LIMIT_SALT` of at least 32 characters for deploy-preview functions, distinct from API keys, and make it available to a rebuilt preview. This is outside the instruction forbidding Netlify settings changes.

## Headers, CSP and Lighthouse

The preview HTML response observed during Step 0 had Content-Security-Policy, microphone=(self)/camera=()/geolocation=(), no-referrer, nosniff, X-Frame-Options DENY and Netlify HSTS. CSP uses script-src self, local fonts, self/jsDelivr images and connections, self/blob media, self workers and manifests, frame-ancestors none and object-src none. Netlify also supplied X-Robots-Tag: noindex on the preview; this is appropriate for a preview. No header change was made.

**CSP interaction audit not run**: scene/chooser/activity/question console violations and installed PWA/Safari/offline behavior are unverified in Stage 6. Header presence alone does not establish those flows.

**Lighthouse not run**: main and /parents performance, accessibility, best practices and SEO scores are unavailable. No /parents page was generated.

## Scope held at the live gate

The user required a passing live run before Step 1. The run failed, so static pages/privacy policies, SEO/social image, Lighthouse tooling, the interaction CSP audit, portfolio README/ARCHITECTURE/DECISIONS work were not started. [Issue #16](https://github.com/dkrnr/pokelearn/issues/16) and [issue #21](https://github.com/dkrnr/pokelearn/issues/21) remain open. PR #9 and both issues are updated with this evidence and blocker.

Risks and limitations: this remains a university demo with unavailable preview answers; the arithmetic gate is not authenticated parental consent; free providers may retain/train on prompts; physical-device and provider retention checks remain outstanding. Existing local/backend regressions passing must not be interpreted as a working live service or public-launch approval. Pre-existing untracked local handoff/research files were left untouched.
