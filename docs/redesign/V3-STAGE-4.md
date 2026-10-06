# Stage 4 — working development brain and repository hygiene

Scope: university portfolio development on `backend/hardening`, with CI-only additions to `redesign/kid-friendly-v3` so its PR can run checks. No main commit, merge, deployment, Netlify setting/account change or Cloudflare work. Existing private `.env` was not edited or staged.

## Development brain

- `BrainProvider` owns configuration/model selection, HTTP payloads, credentials and response parsing. Chat owns guards, input/output checks, quotas, cancellation, retries and fallback. Register another adapter in `netlify/lib/providers/index.mjs`; no UI or chat safety changes are needed.
- Default ordered free models: NVIDIA Nemotron 3 Super, Google Gemma 4 31B, Google Gemma 4 26B. All were verified against the live public catalog by `npm run check:models`; [observations](stage4-model-check.json). The `OPENROUTER_MODELS` environment list is validated and easy to replace. The Gemma endpoints returned 429 during probing; Nemotron worked. Catalog existence does not guarantee endpoint availability.
- Development `AI_PRIVACY=account` inherits existing account privacy settings. It never changes account settings or sends `data_collection:allow`. `AI_PRIVACY=strict` retains opt-in no-collection/zero-retention flags. All calls enforce zero-price endpoints, explicit models, 8-second attempt limits, one retry and a 50-second chain deadline. No free-router.
- `DEMO_MODE=true` serves 20 authored common-question answers; provider failures use the bank, with a calm unknown-topic answer. Origin, consent, input checks and the pause switch apply before demo handling. Rate/quota failures remain friendly error states. Voice still uploads to Valsea in demo mode; `?mock=1`/authored activities avoid uploads. Style/reading misses retry within the bounded budget; detected dangerous content redirects immediately.
- Runtime logs still contain only code, latency and model. The explicit developer smoke/audit saves only synthetic diagnostic results; it must never be used with child data.

## Ten actual local-provider answers

These are real, unedited responses through `/api/chat` using local keys, not authored/demo answers. Each passed the current server reading/length heuristic. All used `nvidia/nemotron-3-super-120b-a12b:free`. Local memory quotas used an ephemeral private salt and the already supported 30-attempt/minute maximum for this synthetic run; default limits were not changed. [Machine-readable run](stage4-real-answers.json).

| Question | Actual answer | End-to-end latency |
| --- | --- | --- |
| Why is the sky blue? | Sunlight hits air. Air scatters blue light. Blue reaches our eyes. | 0.936s |
| How do plants grow? | Plants need sun, water, and soil. Roots drink water, leaves catch light. They grow tall and strong. | 2.985s |
| Why does it rain? | Clouds hold tiny drops of water. Heavy drops fall as rain. | 0.761s |
| Why does the moon shine? | The moon shines by reflecting sunlight. It does not make its own light. We see the bright part facing us. | 0.808s |
| How do rainbows form? | Sunlight bends in raindrops. Light splits into colors. We see a rainbow arc. | 0.564s |
| Why are leaves green? | Leaves are green. They use green light to make food. Sunlight helps them grow. | 1.449s |
| How do fish breathe? | Fish take water in through their mouths. Gills pull oxygen from the water. Water flows out the gill slits. | 1.124s |
| How do birds fly? | Birds flap wings. Wings push air down. Air pushes birds up. | 0.618s |
| Why does ice melt? | Ice gets warm. Warmth makes ice turn to water. | 4.344s |
| What are stars? | Stars are bright balls of gas. They shine by burning fuel inside. They look small from far away. | 0.912s |

Median **0.924s**; range **0.564–4.344s**.

**Factual miss:** the leaves answer says they use green light to make food. That is misleading as an explanation for their green color; leaves reflect much of the green light, and use other wavelengths strongly. The reading/sensitive-content heuristics did not detect it. The stars answer uses a vague “burning fuel” metaphor rather than explaining fusion. Short, readable output is not a scientific accuracy guarantee. The raw observations remain unedited so this limit is visible; controlled demo mode offers reviewed authored alternatives. A provider/quality decision remains a launch blocker.

## Provider disclosures

The grown-ups panel, README and PRIVACY now explicitly disclose that free AI providers may retain/train on questions depending on account options and host policies. Account options were reported by the maintainer, not inspected or changed. See [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/logging).

[Valsea public policy](https://valsea.ai/policies/en), May 2026 v1.1, states 30-day default retention unless an account-specific schedule applies, encryption in transit/at rest, sharing with necessary cloud/ASR/LLM sub-processors, and no audio training without explicit written consent. These are provider statements, not independent verification. Its terms require account users to be 13+; applicability to children using a client's service must be clarified before launch. Recorded audio may contain identifying/background speech before any transcript check. No child recordings were used in verification.

## Requested browser verification

`npm run test:stage4` passed in Chromium at tablet portrait size:

- Sprigatito (#906), verified without a GIF, has actual changing CSS transforms in Artwork mode. Reduced motion turns the animation off. Idle selection now includes all five authored idle reactions.
- Gen 9 + Fire shows **10** Pokémon: Fuecoco, Crocalor, Skeledirge, Charcadet, Armarouge, Ceruledge, Scovillain, Iron Moth, Chi-Yu and Gouging Fire. [Independent live PokeAPI type observation](stage4-gen9-fire.json). Count covers the default species catalog, not alternate forms.
- Blocks: initial wrong answer, all three groups, recap, Done for now, single Wake control and return to idle.

## Safety audit and CI

The real-model shadow audit and GitHub CI/protection verification are documented below when complete. Input checks remain active in the application; only the explicit synthetic diagnostic bypasses them to inspect upstream output.
