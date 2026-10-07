# Stage 8: voice

Stage 8 starts from main `69c0d00`, after PRs #24 and #25 merged. PR #23 was closed with a short comment because main already contains its identity hooks, contributor allowlist and identity CI through #24. No merge was performed. Work is on `feat/stage-8-voice` in `dkrnr/pokelearnz` only.

## Recording and transcription

The browser accepts recordings from 0.7 to 30 seconds and stops at 29.75 seconds to leave room for the final encoded packet. Server binary inspection independently enforces the same bounds and the existing 2 MiB cap. The analyser requires 200 ms of detected voice, follows quiet samples to estimate a noise floor, ends after 1.4 seconds of silence following speech, and ends a quiet microphone after 6 seconds without uploading it. Without an analyser, tap-to-stop and the 30-second ceiling remain available; server checks still apply. These settings are tested with generated streams, not calibrated on children or physical microphones.

The existing server retry is retained: one retry for transient transcription failures, inside a 10-second total deadline, with quotas charged for each send. Authentication, credit, rate limits, low-confidence/no-speech and cancellation do not retry. A failed voice request now consistently offers the kind Type fallback. No duplicate client retry was added.

## Real Valsea benchmark

One bounded local run used the existing real Valsea key without printing it or modifying `.env`. **Synthetic espeak-ng audio is not real children's speech.** The questions use short child-style wording, spoken by local espeak-ng 1.51 (`en-us` and `en-us+f3`, alternating; 155/165 words per minute, pitch 65/55). Local FFmpeg encoded each of 20 unique questions as WebM Opus and MP4 AAC at 48 kHz, with 0.3 seconds of trailing silence. The run exercised production binary validation, multipart rebuilding, retries and transcript checks against the real provider. A run-specific 80-attempt cap replaced hosted quotas; no deployed API or Netlify configuration was touched.

| Format | HTTP 200 / OK | Exact questions | Word accuracy (1 − WER) | Median latency | p95 latency |
|---|---:|---:|---:|---:|---:|
| WebM | 19/20 | 13/20 | 76.3% | 4,706 ms | 4,984 ms |
| MP4 | 20/20 | 13/20 | 79.6% | 3,008 ms | 4,804 ms |

Latency starts immediately before the transcription handler and ends after its response is read. It includes validation, provider calls and any retry; it excludes synthesis, encoding, the child's speaking time and silence detection. The first WebM sample exhausted its single retry and returned TYPE_INSTEAD in 10,008 ms. Total provider attempts: 41 for 40 recordings. The live command correctly exited nonzero for that failed sample; it is not reported as a passing live gate. No live rerun was made.

WER uses word-level edit distance after lowercasing and stripping punctuation, divided by all 93 reference words per format. Missing transcripts count as deletions. Exact means zero word edits. All per-question expected and actual synthetic text, durations and latencies are in [STAGE-8-VOICE.json](STAGE-8-VOICE.json). Generated benchmark audio was temporary and removed at completion; there are no people's recordings in this report.

HTTP success did not imply recognition correctness. Examples include “Why are leaves green?” → “Wireless 3.” and “What do axolotls eat?” → “What do Echolotel need?”. Recognition errors occurred in both formats; no format or buddy voice is claimed to solve them. The synthetic high-pitch voice and espeak pronunciation are possible contributing factors, not established causes. No heuristic was added to silently rewrite a child's question based on these examples.

## Sentence playback and perceived speed

Chat supports opt-in NDJSON sentence events and a final answer envelope, preserving JSON for existing clients. Whole-answer safety, reading-level, factual rules, retries and cache validation finish **before** any sentence is emitted. Provider generation remains buffered: this change does not expose unchecked token streaming or claim lower model inference latency. The loopback server now pipes response bodies without collecting the whole stream.

The browser renders each received sentence into always-on captions and queues one local speechSynthesis utterance per sentence immediately. It can start the first sentence before the final stream frame. There is a visible Listening / Thinking / Speaking label and an Interrupt and talk button; interruption cancels speech, recording and the old request before starting a new microphone session. Buddy changes, dialogs, hidden tabs and sleep retain cancellation behavior. Audio errors, absent local English voices and unsupported speech services keep the captions without an error dialog. Primary buddy types select modest pitch/rate variations; answers remain English. New Sinhala/Tamil state labels are drafts, as with the rest of those interfaces.

[STAGE-8-PLAYBACK.json](STAGE-8-PLAYBACK.json) records a browser fixture with the first sentence scheduled at 180 ms and completion at 800 ms. Speech-start event: **205 ms**; first word-boundary event: **210 ms**, measured from turn submission. This uses mocked speech events and is a pipeline regression measurement, **not real audible first-word latency**. The environment exposed zero native local browser voices. Real device time-to-first-spoken-word remains unverified. The grown-up debug panel and QA snapshot expose speech-start and first-word event timing; unsupported boundary events remain unavailable rather than being replaced with an invented number. No timing telemetry is uploaded or stored.

## Reproduce and verification

`npm run test:voice` runs deterministic voice tests, then the bounded real Valsea benchmark if `VALSEA_KEY`, espeak-ng and FFmpeg are available. It skips live calls in CI or without a key/toolchain. `.env` is loaded only into the live child process. `VOICE_TTS` can select a local espeak-ng binary; `ESPEAK_DATA_PATH` and the normal loader environment can point to a temporary extraction. `VOICE_REPORT` overrides the sanitized report destination. Running the live command consumes provider quota and creates up to 80 provider attempts; it does not need an OpenRouter or Groq key. The full deterministic suite removes live keys and includes voice unit and browser checks.

Verified: recording bounds including actual subsecond WebM/MP4 rejection; generated-stream auto-end and track release; single transient retry and kind Type fallback; chunked stream parsing, sentence ordering, full-output safety before speech, JSON compatibility, origin/consent guards; interruption to listening, caption fallback, and all 18 buddy voice profiles. `npm run build` and `npm run test:all` passed: 65 unit tests plus all browser/accessibility/voice/cancellation/animation/activity/public-page/live-harness/PWA fixtures. `CI=1 npm run test:voice` passed all eight focused tests and skipped live calls; the no-key benchmark path also skipped successfully. The phone Speaking view was captured and visually checked locally.

Unverified: real children/accent/noise recognition, physical Chrome/Safari/iOS/Android capture and playback, audible first-word latency, device-specific voice quality, deployed streaming/buffering/CSP/runtime behavior, fresh live answer-model output and human Sinhala/Tamil review. The 40 synthetic samples are a diagnostic dataset, not a launch-quality or child-speech accuracy claim. Existing provider age/privacy, factual accuracy and asset-permission limitations remain.

Identity hooks stay active; staged files were checked for secrets before each small commit. No secrets, local owner notes or research were staged. No force-push, merge, deployment command or Netlify settings change was performed.
