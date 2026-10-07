# PokeLearn v3 — Stage 1 checkpoint

Repository verified at `/performance/projects/dkrnr/pokelearn`, origin `git@github-dkrnr:dkrnr/pokelearn.git`. Created `redesign/kid-friendly-v3` from `redesign/kid-friendly-v2`. Read main's app, complete personality file and all three Netlify functions. Main remains untouched. Existing untracked handoff/research items remain untouched.

## Delivered at this checkpoint

Full-bleed meadow, animated Pokémon teacher, universal CSS motion, random idle behavior, tap tricks/particles, chunky microphone, listening/thinking/speaking/friendly-error states, always-visible captions, secondary keyboard dialog, sleep/yawn/wave and calm end screen. No cards/tabs/default text screen. Buddy stage is 50% of viewport height on phone, 52% on portrait tablet and approximately 49% on landscape; the visible sprite depends on its aspect ratio and transparent bounds.

Pokédex chooser: all 1,025 public names/types in a local catalog, name/#number search, readable type colors plus symbols/words, shiny, surprise, six-item recent shelf, 24 choices per page, lazy images and bounded visited-sprite caching. Buddy identity/personality/images/search live in one module. See V3-SPRITES.md for source comparison and hosts. No image collection added.

One-time device consent behind a grown-up arithmetic gate; no repeated child consent message. Native browser permission remains separate. Provider disclosures and fan notice are in the panel and footer. Saving choices is optional. EN/SI/TA controls and transcription retained; new machine translation drafts marked in V3-TRANSLATION-REVIEW.md. Readex Pro remains self-hosted. Reduced motion uses still images and removes procedural motion. Audio stays off on load; a mic tap authorizes spoken replies unless the child has explicitly muted them. Read aloud is also available by tap, and missing local voices leave captions quietly available. Authored-line prerecorded audio support is present as a local-asset-first hook; recordings and activity wiring belong to Stage 2.

`/?mock=1` works without keys, microphone access, speech-recognition services or provider calls. It honestly labels the pretend question, responds once and supports both tap-stop and simulated silence. The live recording path follows main's direct recording → Valsea transcript → OpenRouter answer flow, bounded by v2 child-safety/stopping rules. No sentiment call, rewards, history or follow-up prompts.

## Verification

- `npm run build`: passed. Allowlisted public files only; no private repository files, .env or tests in the build.
- `npm test`: all six original server/content/policy tests passed; the enforcement file is unchanged.
- `node tests/v3-smoke.mjs`: passed mock listening/stop/silence/thinking/speaking, cancellation, text fallback, selector #1025 and name search, shiny, pagination, recent shelf, surprise, one-time consent persistence, wrong gate answer, data withdrawal, draft SI/TA controls, reduced-motion still images, no automatic sound/mic/provider calls, denied-mic friendly response, offline shell/catalog/visited sprite, and WCAG A/AA scans of scene/chooser/keyboard/grown-ups.
- `node tests/v3-voice.mjs`: passed real browser MediaRecorder and RMS silence auto-end using a generated tone/silence MediaStream and mocked transcription/chat responses. Checked multipart audio contract, direct transcript-to-chat, track release and cancellation without a provider upload. Synthetic signal goes only to a MediaStream, never speakers.
- Two documented visual review/fix rounds and final inspection: 45 committed screenshots in three folders, at 390×844, 820×1180, 1180×820. Final captures have loaded visible thumbnails, no page exceptions, no horizontal overflow, all visible buttons at least 56px, and scroll position 0. See V3-VISUAL-REVIEW.md.
- Source diff against the v2 base confirms `netlify/functions`, Netlify configuration, `activities.js` and `tests/policy.test.mjs` unchanged.

## Local run

    npm ci
    npm run build
    npm start

Open `http://127.0.0.1:4178/?mock=1`. To verify while the server runs: `npm test`, `npm run test:v3`. Capture: `REVIEW_ROUND=v3-review npm run screenshots:v3`. Rebuild after edits. An older installed service worker may need its tabs closed before the new app takes control. Local builds print the repository's existing Node module-type warning; Netlify functions remain CommonJS, so the package type was not changed.

## Unchanged function observations and verification limits

`chat.js` forwards messages to OpenRouter, with `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `inclusionai/ling-3.0-flash-fin:free` and `openrouter/free`. `transcribe.js` forwards multipart recordings to `api.valsea.ai/v1/audio/transcriptions` and returns text. `sentiment.js` remains present but unused. Each proxy retries once after HTTP 429; missing server keys produce HTTP 500. The functions check basic method/payload requirements but do not enforce frontend consent or the child-answer bounds themselves. No function changes were made.

Live provider answers/transcription, physical microphone permission/audio, installed device voices and real Safari/iOS/Android tablets remain unverified. The environment's native fake-microphone attempt returned NotSupportedError, so recorder integration was verified with a generated stream instead. CDN images loaded in the final browser captures and offline visited-image behavior passed; all 1,025 animated/shiny variants were not individually downloaded or audited. Host availability, mutable upstream asset updates and cold-load tablet performance are not guaranteed by these desktop emulations. Translation drafts need human review; prerecorded authored audio assets are not produced in Stage 1.

The six authored activities and prior v2 browser/PWA test scripts are preserved, but their old card/tab selectors do not describe the v3 scene. They were not claimed to pass; Stage 2 will connect scene props and adapt those UI checks. No activity props were added at this checkpoint.

## Milestones and handoff

- `165e784`: concept and ASCII wireframes, committed/pushed before implementation.
- `0abb1ca`: Pokémon scene, chooser, mock/live frontend voice flow and source/translation notes, committed/pushed.
- Final evidence commit: Stage 1 verification scripts, visual review, screenshots and this report.

Compare: https://github.com/dkrnr/pokelearn/compare/redesign/kid-friendly-v2...redesign/kid-friendly-v3

Stopped after Stage 1. No gh, merge, force push, history rewrite, deployment or Netlify setting change. Wait for the user's “continue” before Stage 2.
