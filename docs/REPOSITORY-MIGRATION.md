# Repository migration checkpoint

The active GitHub repository is [dkrnr/pokelearnz](https://github.com/dkrnr/pokelearnz), and the development checkout is `/performance/projects/dkrnr/pokelearnz`. Use this checkout for new work. The previous checkout and private external backups remain recovery copies; do not merge or push their old history into this repository.

## Local work

The user transferred `.env`; it remains ignored and was not overwritten. Local notes (`LEARNINGS.md`, `SOL-HANDOFF.md`, `STUDIO.md`), research, QA evidence, the ignored legacy `config.js`, and the existing Netlify site binding were copied with matching file bytes. Notes and research remain untracked; `.env`, legacy config, QA artifacts and `.netlify` remain ignored. Dependencies and the public build were regenerated in this checkout. Old generated Netlify database/runtime caches remain in the recovery checkout and are regenerated locally when needed.

Only repo-local Git identity/configuration is set. The approved account uses its GitHub noreply email, `user.useConfigOnly=true`, and `core.hooksPath=.githooks`. The pre-commit and pre-push identity safeguards pass in this checkout. [Identity-guard PR #23](https://github.com/dkrnr/pokelearnz/pull/23) remains open; its workflow will protect future PRs after acceptance. Existing main protection is preserved; no merge was performed.

## Netlify verification

Read-only Netlify API checks on 2026-10-07 confirmed the existing `pokelearnz` project now uses `dkrnr/pokelearnz`, production branch `main`, build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`. The production deploy is ready at rewritten main commit `0d6a2c14a55930c69056d19de42ac6fa1583b543`. The owner relinked Netlify; no settings or deployment commands were changed by this migration work.

A Playwright check against production verified the 1,025-buddy scene, the grown-up gate sending the pending typed question exactly once, the chooser's Gen 9 Fire count, and an authored activity. Both key-presence health flags are true. No CSP violations or browser errors appeared during those interactions. CSP, HSTS, no-sniff, referrer policy and permissions policy headers were present.

The single synthetic science question, “What do axolotls eat?”, returned a valid authored-bank answer with HTTP 200, `code: OK`, and `lastError: DAILY_LIMIT` for the Nemotron free model. This verifies the request path and fallback, **not a fresh model answer**. Provider quota availability remains unverified until the daily limit resets. No further model-backed questions were sent after that result. A separate production authored-greeting probe was blocked during navigation by `ERR_CONNECTION_CLOSED`, before any question was sent. This network limitation does not erase the earlier successful production interaction; greeting verification on the new preview is recorded separately below.

## Verification and remaining work

`npm ci`, `npm run build`, and `npm run test:all` passed from the new checkout: 40 unit tests and the existing browser, accessibility, voice-fixture, activity, offline, cancellation and service-worker update checks. Live providers are excluded from this deterministic suite. The pushed checkpoint's GitHub checks and preview evidence are recorded on [PR #23](https://github.com/dkrnr/pokelearnz/pull/23).

Real voice transcription, physical devices, collaborator access and a fresh free-model answer are not verified by this checkpoint. The two collaborator invitations remain for the owner to coordinate. The old GitHub repository remains for manual deletion after migration acceptance. Native historical PR/check events were not recoverable; PRs #1–#10 are closed archive issues with their original numbering.

Continue development here:

```sh
cd /performance/projects/dkrnr/pokelearnz
npm ci
npm run build
npm run test:all
npm start
```

For a new checkout, set the approved account identity locally and run `git config core.hooksPath .githooks` before committing. Local Netlify development uses the private ignored environment file and `netlify dev --offline --no-open`; provider calls still consume quota. The deterministic regression suite excludes live provider keys and does not load `.env`.
