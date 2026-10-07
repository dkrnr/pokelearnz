# Stage 6 recheck — small-talk passes, live gate 8/10

Commit `59be89f` is pushed on `redesign/kid-friendly-v3`. Netlify's automatic PR #9 preview rebuild succeeded before this run. The [small-talk implementation report](V3-STAGE-6-SMALL-TALK.md) explains the FOLLOW_UP false positive, authored replies, transport exception and bounded recovery. The complete deterministic suite passed: 40 unit tests plus browser, activity, accessibility, cancellation, voice fixtures and PWA regressions. No real child data or live provider credentials were used for those tests.

The user set RATE_LIMIT_SALT outside this task. We changed no Netlify settings. A subsequent read-only health fetch hit curl error 35, TLS unexpected EOF. The requested browser retry nevertheless connected and completed all ten prompts. Connection failure is no longer the blocker in this run.

Command: `LIVE_REPORT=docs/redesign/V3-STAGE-6-LIVE-SMALL-TALK.json npm run test:live -- https://deploy-preview-9--pokelearnz.netlify.app/`

Results: **exit 1, 8/10 pass**, pending-question auto-send **true**, all responses HTTP **200**, envelope code **OK**, all ten leave thinking gracefully. Median time to answer was **1,241.5 ms**. [Full real results](V3-STAGE-6-LIVE-SMALL-TALK.json).

- Five scientific replies came from `nvidia/nemotron-3-super-120b-a12b:free`: axolotls, octopus hearts, blue sky, plants and rain.
- `hi there` returned authored/model none, no error: `Pika! What would you like to learn?` The question was preserved in the visible caption. No OUTPUT_BLOCKED appeared in this run.
- Leaves used the authored science bank after `lastError: PROVIDER_UNAVAILABLE` (last attempted model: `google/gemma-4-26b-a4b-it:free`). Its fact check passed.
- Moon used the authored science bank after `lastError: DAILY_LIMIT`. Its fact check passed.
- **What do bees do?** and **Why should I wash my hands?** returned the friendly unknown fallback after `lastError: DAILY_LIMIT`; both failed the factual answer check. The existing authored bee entry covers honey/flowers questions, not this general prompt; no handwashing entry exists.

The active blocker is the upstream daily free-model limit, not missing salt or origin rejection. No missing-key code was observed. Successful live AI replies establish OpenRouter access in this run; Valsea voice transcription was not exercised or reverified. The health fetch did not return a key-presence result on this recheck.

Exactly ten synthetic prompts were submitted, including the greeting, with no second live run or manual prompt retries. Server retry attempts remain quota-counted. We did not alter the fixture's fact requirements, expand the answer bank to turn this failing run into a pass, bypass quota limits, enable demo mode or change account settings.

Because the user requires both the small-talk fix and live gate to pass before subsequent work, The remaining Stage 6 implementation stays gated. Static pages/SEO/social assets, Lighthouse tooling and scores, deployed interaction CSP audit, portfolio README/ARCHITECTURE/DECISIONS are not claimed complete. Headers observed in the initial report are only presence evidence; current interaction CSP violations are unverified. PR #9 and issues #16/#21 are updated with the present result; both issues remain open.

Risks: preview answers now work while free quota is available, but coverage degrades to authored/unknown fallbacks when exhausted. These ten lightweight fact checks and automated regressions do not establish factual correctness for arbitrary questions, complete child safety, provider retention guarantees or suitability for unsupervised children. No merge, force-push, manual deployment or Netlify settings change occurred.
