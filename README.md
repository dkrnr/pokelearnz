# PokeLearn · Discovery Camp

A Pokémon learning companion with a calm, child-led interface. Ask a question or explore a short plant activity, then finish at your own pace.

This makeover is on `redesign/kid-friendly-learning`. It replaces the catalog-first MVP layout with a visible question composer, illustrated camp and field notebook. It removes streaks, star accumulation, automatic quizzes, automatic reward sounds and prompts that pressure children to keep talking.

## What you can do

- Investigate sunlight and water in a local, authored plant activity. The illustration represents changes over days, not instant real growth.
- Try an optional check, keep a factual recap, or stop at any stage.
- Choose from the existing 1,025 Pokémon names through search and pages of six. Six familiar companions and Pikachu's shiny artwork are bundled for offline use; other artwork requires connectivity and has a named fallback.
- Ask questions through visible typing or the existing VALSEA recording/transcription interface. Chat still uses the existing Netlify server handlers and configured OpenRouter provider.
- Use English or Sinhala interface text. Tamil is a voice-input choice with an English interface. AI replies remain English, as in the MVP. Native editorial review of Sinhala remains necessary.
- Optionally remember only the buddy, appearance and completed plant activity on the device. Default is session only. Questions, answer history and audio are never saved to device storage by this interface. A grown-up can reject saving, withdraw it, and clear legacy PokeLearn storage.
- Add the site to a device's home screen. The public app shell and local plant lesson work offline after a successful first online visit. Online questions and transcription do not work offline.

The Pokémon is a fictional learning character. There are no locked buddies, leaderboards, daily return pressure, push notifications, collection-completion goals or endless auto-advancing lessons. These are design protections, not a guarantee that any digital product is addiction-proof.

## Run locally with plain Node

Node 22 or newer. There are no runtime package dependencies.

```sh
npm run build
npm start
```

Default: `http://127.0.0.1:4178`. `PORT` and `HOST` are configurable:

```sh
PORT=8080 HOST=0.0.0.0 npm start
```

The local server serves only generated `dist/` public output and adapts the existing `/.netlify/functions/chat`, `/transcribe`, and `/sentiment` routes. It does not expose the repo root, `.env`, research notes or server source.

The local lesson needs no keys. For existing online features, create a gitignored `.env` with `OPENROUTER_KEY` and `VALSEA_KEY`, then use Node's environment-file support:

```sh
node --env-file=.env server.mjs
```

Do not put secrets in frontend files. Provider availability, quota, pricing and live voice quality depend on the configured services. This makeover's automated verification uses local fixtures, not live provider calls. Historical QA recorded transcription failures; this pass does not claim they are fixed.

## Docker

```sh
docker build -t pokelearn .
docker run --rm -p 8080:8080 pokelearn
```

If needed, pass server-side credentials with `--env-file .env`. Production outside Netlify is supported by the same Node entry. The Docker recipe must be tested with an available Docker daemon before claiming container execution.

## Netlify

`netlify.toml` builds the public `dist/` directory, rather than publishing the whole repository, and preserves the existing functions directory. Set the provider secrets only in server-side deployment environment variables. No deployment is performed by the makeover branch itself.

## Install on a device

Serve over HTTPS in production. On iPhone/iPad, open in Safari, select **Share → Add to Home Screen**, and keep web-app mode enabled where offered. On supported Android/desktop browsers, use the native install action or the browser's app-install menu. PokeLearn's **Add to your device** action shows the appropriate instructions; it does not repeatedly prompt.

The service worker caches a fixed allowlist of public files and bundled artwork. Build-derived cache names avoid stale assets when the public build changes. Old app caches are removed only when a new worker activates. An update waits for a safe user-selected refresh. It never stores or replays API requests, recordings or chat responses.

## Verification

```sh
npm test
```

Production-server checks cover public resources, install metadata, private-file rejection and API guards. They deliberately remove the test process's chat key to avoid provider calls.

Browser checks use the websites studio's Playwright tooling:

```sh
POKELEARN_QA_MODULE=/performance/projects/codex_projs/webistes/node_modules/playwright/index.mjs npm run test:ui
```

Alternatively, use a locally available `playwright` package or set `POKELEARN_QA_MODULE` to its module path. Set `POKELEARN_TEST_URL` for another test server. Browser fixtures are labeled as fixtures; they verify frontend behavior, not AI answer quality or voice accuracy.

Studio gate configuration and source manifest live in `qa/`. Screenshot, motion and functional evidence lives in `qa/artifacts/`. `STUDIO.md` records the latest exact revision, verification and open limits. Creative acceptance, real child/grown-up tasks, physical iPad/Android installation and device keyboard/performance checks are separate from browser emulation.

## Assets and attribution

App code retains the project's MIT license. Pokémon image ownership is separate: image contents are copyright The Pokémon Company. Source: [PokéAPI sprites](https://github.com/PokeAPI/sprites), pinned at `a3a1432e688ea028f12c51371d5253037cb9f17b`. Source metadata is in `assets/sprite-source.json`; the local name index is a snapshot from PokéAPI. Free access to data/media is not an unrestricted commercial artwork license.

The camp landscape, specimen diagram and notebook mark are authored SVG/HTML/CSS. No paid asset pack, external image generation, rigged Pokémon model, or hosted scene runtime is used.

Originally built for Cursor Colombo Buildathon 2026 by Dunith, Ibaad and Zahrah. The existing provider handlers remain part of that MVP foundation.
