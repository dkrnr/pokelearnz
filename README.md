# PokeLearn

A playful learning web app for children aged 6–9, with six authored offline activities: plant helpers, animal homes, number building, shape matching, first sounds and picture stories. Each is designed for approximately 3–5 minutes of child-paced exploration and talking with a grown-up. Actual pacing and usability still need testing with children.

The original leaf buddy is the default. `buddy.js` owns character names, optional fan artwork, asset paths and fallback rendering. Swap that module to replace the fan characters; the activity and question code uses a neutral buddy contract. Original vector lesson pictures are in `art.js`.

## Run locally

Use Node 22 or later:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4178. For a labeled development answer fixture with no AI request, open http://127.0.0.1:4178/?mock=1. Mock mode works only on localhost and loopback addresses.

The public build is an allowlist in `scripts/build.mjs`. Source files, documentation, credentials and QA artifacts are not served. After changing source, rebuild before refreshing the preview. `npm start` serves `dist/`, not the repository root.

## Verification

```sh
npx playwright install chromium
npm test
npm run test:ui
npm run test:pwa
REVIEW_ROUND=final npm run screenshots
```

Keep `npm start` running for UI tests and screenshots. The PWA update test starts its own controlled fixture on port 4181. `POKELEARN_TEST_URL` can select another local test server. `POKELEARN_QA_MODULE` and `POKELEARN_AXE_PATH` can select preinstalled Playwright and axe modules.

Server tests check public/private file boundaries and unchanged backend method/missing-key responses. Policy tests and browser checks guard against pressure, reward counters, notifications, autoplay and chat continuation. Browser fixtures test all six lesson completions, mistakes, keyboard focus, 56px buttons, axe WCAG A/AA checks, offline reload, consent/withdrawal, local-only speech, voice review, provider failures, request cancellation, reduced motion and character replacement. They do not prove suitability for children.

Screenshots and two review-and-fix rounds: [docs/redesign/VISUAL-REVIEW.md](docs/redesign/VISUAL-REVIEW.md). Final QA and known limitations: [docs/redesign/REPORT.md](docs/redesign/REPORT.md). Older `qa/` reports describe the preceding Discovery Camp and do not validate this redesign.

## Parent controls and data

Saving is off by default. Explicit grown-up consent saves only the buddy choice and a completed-activity flag, preserving the previous `pokelearn_camp_v1` schema. Withdrawal clears PokeLearn storage, including legacy question history. Questions, transcripts, recordings and answers are never saved or cached by the frontend. Static public resources are cached separately for offline use. Sound effects start off every visit.

Optional questions and microphone use require a grown-up's session opt-in. Netlify receives function requests. Questions and reviewed transcripts go to OpenRouter and its selected inference provider. Voice recordings go to Valsea. The configured model families are Google Gemma, NVIDIA Nemotron and InclusionAI Ling with a free-router fallback; the actual downstream inference host cannot be identified from the frontend. Local read-aloud uses only browser voices marked `localService`. No remote font or sprite requests are made by child screens.

The existing `netlify/functions` are unchanged. Real AI answers can be wrong; a prompt, length limit and basic input/output checks are not a complete child-safety system. Factual lessons come exclusively from `activities.js`, never from an AI answer. Online failures do not block offline lessons.

EN/SI/TA scaffolding remains. Unreviewed machine translations are listed in [docs/redesign/TRANSLATION-REVIEW.md](docs/redesign/TRANSLATION-REVIEW.md) and withheld from lesson UI and read-aloud. Sinhala/Tamil currently select optional transcription language only. English phonics remains explicitly English.

Unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company. Original buddy and vector artwork are repository-native. Optional static fan sprites retain their source attribution in `assets/sprite-source.json`; no claim of licensed animated fan artwork is made. Self-hosted Readex Pro includes its SIL Open Font License in `assets/fonts/OFL.txt`.
