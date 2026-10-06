# Contributing

Work only in `dkrnr/pokelearn`. `main` is the behavior reference and receives reviewed pull requests, never direct feature work.

- UI review: `redesign/kid-friendly-v3` → `main`.
- Backend review: `backend/hardening` → `redesign/kid-friendly-v3`.
- New work: create a focused branch from the appropriate review branch; do not merge or deploy automatically.

Make small logical commits, inspect `git status` and the staged diff before each commit, and push milestones without rewriting history. Never commit `.env`, keys, child data, `node_modules` or generated test output. `.env.example` contains blank credentials only. Do not change hosting/account settings as part of a code change.

Use Node 24 (minimum 22.12), `npm ci`, `npm run build`, then `node scripts/test-all.mjs`. Install Chromium with `npx playwright install --with-deps chromium`. Tests use fixtures and mock voice; they do not need AI keys. See README for optional, explicitly initiated live development checks.

Preserve voice-first interaction, persistent captions, reduced motion, keyboard fallback, touch targets and finite activities. No streaks, counters, pressure, notifications, autoplay or endless follow-ups. Sinhala/Tamil drafts need human review. Add meaningful regressions for safety or interaction changes and explain unverified providers/devices in the PR.

The maintainer decides when to merge and deploy. Main protection intentionally permits administrator bypass for this solo project; that is an emergency escape hatch, not the normal branch flow.
