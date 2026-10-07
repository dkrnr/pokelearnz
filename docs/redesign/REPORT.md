# PokeLearn v2 delivery report

Branch: `redesign/kid-friendly-v2`, created from `redesign/kid-friendly-learning` in `/performance/projects/dkrnr/pokelearn`. The previous branch's uncommitted offline/PWA, consent and QA foundation was preserved in a separate commit before redesign. Existing research and handoff files were left untouched and untracked. No parent repository was used.

## Delivered

Six static authored activities across science, maths and words, using building, matching, ordering and tap-to-sort. An original CSS leaf buddy idles, leans in, thinks, celebrates once per activity per visit and waves goodbye. Fan names, sprite references and fallback rendering are isolated in `buddy.js`; only that module's selected sprites enter the public build. Warm vector scenes, self-hosted Readex Pro, large rounded controls, local read-aloud, optional sound off by default, a finite question/answer screen and a calm real-world exit replace Discovery Camp.

Grown-ups can opt into online questions for the current session and optional minimal device storage. Transcripts are reviewed before sending questions. The panel names Netlify, OpenRouter and Valsea, describes downstream routing uncertainty, includes the fan disclaimer and keeps Sinhala/Tamil drafts behind a human-review gate. The old storage schema and withdrawal behavior remain. No backend function was changed. Existing local build configuration was preserved; no remote Netlify settings were changed, and nothing was merged or deployed.

## Verification evidence

- `npm ci --offline --ignore-scripts` successfully installed the locked development dependencies in this workspace.
- `npm run build` succeeds; only allowlisted public app files are served.
- `npm test`: six server/security/content/policy tests pass.
- `npm run test:ui`: twelve browser groups pass. These include all six activity completions at 390×844, 820×1180 and 1180×820; axe WCAG A/AA audits of shelf, lessons, recap, goodbye, question/answer/failure and parent modal; 56px button dimensions; icon-and-word buttons; no horizontal overflow; keyboard focus; optional storage and blocked storage; gesture-only audio; local voice gating; bounded answers; development mock; request cancellation; voice permission/transcript review; all lessons after offline reload; cache privacy; reduced motion; original buddy fallback; language gating; and no-JavaScript guidance.
- `npm run test:pwa`: controlled update deferral and old-cache deletion pass; actual idle/celebration/goodbye animations and once-only celebration pass.
- Two visual review-and-fix rounds plus final inspection are documented in `VISUAL-REVIEW.md`. Screenshots for all requested viewports are committed under `screens/`; final captures include all six activity types.
- No application exceptions or unexpected console errors were observed in the final browser runs. Deliberately failing HTTP provider fixtures produce Chromium's normal failed-resource console messages; those expected network diagnostics are distinct from application errors.
- A source diff confirms `netlify/functions` is unchanged.

These checks establish tested behavior and layout constraints. They do not establish that children find the app delightful or usable.

## Observed failures and handled failure fixtures

**Observed from the unchanged local backend:** chat returns HTTP 500, `OPENROUTER_KEY not set`; transcription returns HTTP 500, `VALSEA_KEY not set`. Neither provider's real answer or recording behavior could be tested here.

**Observed in browser/emulation:** no usable installed local speech voice in headless Chromium. Listen shows a friendly notice and retry. Local synthesis success was tested with a stub, not a real installed voice.

**Injected regression fixtures:** chat HTTP 429 and 503; transcription HTTP 503; microphone permission denial; pending permission resolving after exit; late chat responses after Stop/Done/parent opening/buddy change; blocked localStorage; sprite loading failure; offline questions. These were frontend failure-handling checks, not observations of live provider outages. Provider responses that exceed the reading limit, contain unsafe text, or consist only of a follow-up question are rejected rather than turned into lesson facts. A 15-second internal request timeout has no countdown UI; the same retry state handles aborted provider requests. Live timeout behavior is not separately verified.

## Running locally

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:4178`. Local mock: `http://127.0.0.1:4178/?mock=1`. For browser tests, install Chromium with `npx playwright install chromium`, leave the local server running, then run `npm test`, `npm run test:ui`, and `npm run test:pwa`.

## Publication

Every milestone was pushed with `git push -u origin redesign/kid-friendly-v2`. SSH Git authentication succeeds. `gh auth status` reports invalid authentication for the configured GitHub accounts, so a draft PR cannot be opened through `gh` in this session. No authentication settings or remotes were changed.

Compare URL for creating a draft PR into main: https://github.com/dkrnr/pokelearnz/compare/main...redesign/kid-friendly-v2

No Netlify branch preview URL was verified. The likely branch hostname could not be accessed, and authenticated deployment metadata is unavailable. This is not a claim that no preview exists.

## Explicitly unverified

- Physical phones/tablets, touch behavior, OS microphone permissions, installed PWA behavior and virtual keyboards on real devices.
- Real children aged 6–9, parent usability, delight, reading comprehension and actual 3–5 minute pacing.
- Sinhala/Tamil wording, pronunciation and cultural suitability; drafts remain unreviewed and withheld from lesson UI.
- Real AI backend quality, model routing/inference host, production availability, real voice transcription and provider data retention.
- Real locally installed speech voices and pronunciation; only synthetic browser fixtures succeeded here.
- Netlify branch preview and deployment status; draft PR creation is blocked by the existing invalid `gh` authentication.
