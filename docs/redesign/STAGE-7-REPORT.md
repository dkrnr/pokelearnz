# Stage 7: answer quality and demo polish

Started from main at PR #24's verified merge `ab6d1bd` on 7 October 2026. Work is on `feat/answer-quality-demo` in `dkrnr/pokelearnz` only. Identity hooks remain active; staged files are checked for credential patterns and private material before each small commit.

## Model choice and local comparison

[Catalog evidence](STAGE-7-MODELS.json) confirms both `openai/gpt-oss-120b` and `openai/gpt-oss-20b` active with 131,072-token context windows. The active catalog's other chat candidates were Qwen 27B and Allam 7B; speech, safety and tool-agent models are excluded. 120B is the largest eligible free-tier chat model in this catalog, so the default order is **120B → 20B**. Explicit `GROQ_MODELS` overrides still take precedence. No local `.env`, account policy or Netlify setting was changed.

Groq's [published free-plan limits](https://console.groq.com/docs/rate-limits) at this check were the same for both: 30 RPM, 1,000 RPD, 8,000 TPM and 200,000 TPD. Actual response headers confirmed 1,000 RPD and 8,000 TPM for this account. Limits can change and apply at organization level. The app retains its 4-second attempt/14-second overall deadlines, 512 completion-token cap, quotas, JSON schema and one strict output retry. A Groq model limit now advances to the next configured model; OpenRouter daily exhaustion still skips all its free models.

The local benchmark sent exactly **10 synthetic questions to each model (20 calls)** through the production Groq adapter and revised grammar prompt. It made no retries, OpenRouter calls, hosted app-cache writes or quota-setting changes. Seven-second pacing kept it below the minute token budget. Both returned ten answers without quota/authentication/timeout failures. This is a tiny single-sample comparison, not an accuracy benchmark or human child-reading review.

| Model | Output checks at comparison time | Keyword rubric | Median latency | Cache eligibility at comparison time |
| --- | --- | --- | --- | --- |
| GPT-OSS 120B | 9/10 | 8/10 | 1,309.5 ms | 9/10 |
| GPT-OSS 20B | 3/10 | 9/10 | 1,015.5 ms | 3/10 |

Science references used for the desk review: [NASA quasars](https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-quasars/), [NASA Moon phases](https://science.nasa.gov/moon/moon-phases/), [USGS water density](https://www.usgs.gov/water-science-school/science/water-density) and [NWS thunder](https://www.weather.gov/safety/lightning-science-overview).

The rubric is deliberately reported separately: it does **not** prove correctness, completeness or grammar. Agent desk review found failures the keyword rubric missed:

| Question | 120B review | 20B review |
| --- | --- | --- |
| Quasar | Correct bright galaxy core/gas explanation; complete sentences. | Correct core/gas explanation; complete sentences. |
| Green leaves | Grammatical chlorophyll explanation, but lacks reflected-green-light mechanism; existing handler would reject it if bank bypassed. | Explains absorption/reflection; fails current reading-grade heuristic. |
| Moon phases | Correct sunlight/lit-part explanation. | Long sentences; does not clearly distinguish reflected sunlight from the Moon making light. |
| Ocean tides | Mentions Moon and Sun pulls; fails reading-grade heuristic despite short sentences. | “Sun also helps” omits an article; vague Earth-rotation statement; fails reading heuristic. |
| Rainbow | Clear bending/splitting through drops. | Plausible mechanism; exceeds word limits. |
| Seasons | Correct tilt/orbit explanation. | Short and grammatical, but omits orbit/location detail. |
| Floating ice | **Wrong:** molecules do not become lighter. Keyword rubric incorrectly passed it. | Correct less-dense/freezing explanation. |
| Plant food | Simple sunlight/water/air explanation. | Plausible sugar/chlorophyll explanation; exceeds word limits. |
| Thunder delay | Correct difference in light/sound speed. | **Misleading:** cooling is described as making thunder; rapid heated-air expansion causes it. Also exceeds word limits. |
| Black hole | Basic gravity explanation; does not explain light's inability to escape the boundary. | “Nothing can escape its pull” lacks the event-horizon boundary and can imply everything nearby is trapped. Also exceeds word limits. |

[All twenty answers, timings, numeric limit headers and exact comparison prompt/hash](STAGE-7-GROQ.json) are synthetic evidence. Larger improved format compliance in this sample, but did not eliminate factual errors. Neither model is a trusted fact source.

The final prompt requests two or three complete, grammatical sentences for ages 6–9; it preserves articles, removes the five-word/one-syllable preference, retains existing word/character bounds, and explicitly says **“I'm not sure. A grown-up can help.”** on uncertainty. After the comparison, the observed ice claim gained a named rejection rule, regression and prompt correction. Under the final rules the saved 120B outputs pass **8/10**, versus **3/10** for 20B. The final ice prompt addition has not received a second ten-question live benchmark; no extra inference run was made.

## Cache and public pages

- Serving TTL: 24 hours. `CACHE_VERSION` (default `2`) participates in HMAC keys and entry metadata; changing it excludes all previous answers. V2 ignores all legacy 30-day blobs.
- Reads and writes exclude answers below 40 characters/eight words and uncertainty/hedging phrases. This is conservative screening, not proof of correctness. Cached model answers are explicitly **unverified** in the parent/privacy pages, settings, repository docs and grown-up debug label.
- [Cache runbook](../CACHE.md) and dry-run-first `cache:purge` delete only application answer-cache blobs across all listing pages, preserving quota and provider-state records. The hosted purge/version-setting operation was not performed.
- `/`, `/about`, `/parents`, `/privacy` and `/contact` were audited. The quoted “Collaborate on projects before going live” section was absent from tracked application sources; previous deployed evidence identifies the injected `app.netlify.com/cdp` review drawer. Both page stylesheets now hide that exact hosting iframe path. This is presentation cleanup, not a hosting-setting change, and does not prevent the iframe's network load.
- Public prose removes developer-test/production-recording jargon and key-configuration instructions. Provider/storage disclosures remain where they help families understand data use. Debug stays gated and opt-in. **AI can be wrong, ask a grown-up.** is visible beside the answer caption.

## Demo and credentials

[Three-minute walkthrough](../DEMO.md) uses exact authored-bank questions, `?demo=1`, the chooser, Blocks, Sleep and parents. The [18-second README GIF](../portfolio/demo.gif) was Playwright-recorded from the local authored flow, visually inspected, and encoded at 720 px / 8 fps (about 2.6 MB). It contains one synthetic forced-demo chat request, saved device opt-in, no model calls or microphone uploads; it does not demonstrate the real gate or fresh inference.

The old credential type was an **OpenAI-style API secret key** in historical `config.js`, identified in the migration/push-protection checkpoint. No value or recovery history was read/published here. [Exact owner rotation steps](../CREDENTIAL-ROTATION.md) cover immediate revocation, usage review, replacement only if needed, every secret consumer and verification. Revocation remains unverified.

## Verification checkpoint

Local and preview results will be added after the final checks. One preview live run is permitted, with at most three synthetic questions. The separate 20-call local Groq comparison above was explicitly requested; it is not a second deployed live gate.

No force-push, merge, manual deploy or Netlify settings change was performed. Remaining reviews include human factual/language/child usability review, real Valsea and physical devices, provider account/age/consent terms and fan-asset permissions.
