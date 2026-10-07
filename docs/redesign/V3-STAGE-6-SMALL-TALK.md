# Stage 6 small-talk fix

The greeting false positive is reproducible with `Hi there! How are you?`: the old hooks expression contained an unconditional question-mark rule. The transport validator also disallowed question marks, and the browser stripped any question sentence. The actual reported provider text was not available (application logs deliberately do not retain outputs), so its exact live rule cannot be reconstructed. New named output-rule codes identify future rejections without logging content.

Small-talk is now authored in the server after origin/consent/input safety checks and before provider configuration or upstream quota reservation. Exact whole-utterance matches cover greetings, thanks, goodbye, name, boredom and how-are-you. Pikachu's Pika cue and gentle type cues give the selected buddy a voice; names come from the trusted catalog. Sensitive or mixed utterances cannot be swallowed by greeting substring matches. No model call is made for these replies. This server-local handling still requires the normal online-question consent and request.

Authored greetings may contain one short approved question (`How are you?` or `What would you like to learn?`). This permission requires authored/greeting transport metadata. AI science answers still cannot contain follow-up questions. Other engagement, privacy, dependency and harmful-output rules remain in place.

A harmless input whose model answer triggers OUTPUT_BLOCKED gets exactly one extra attempt on the same model with a stronger static prompt. The rejected answer is neither shown nor included in that prompt. Every attempt remains subject to quotas, per-attempt timeout and the whole-request deadline. If recovery fails, the handler returns an authored science answer where known, otherwise the friendlier “That one has me stumped. We can find out with a grown-up.” Sensitive/distress inputs still stop before providers. This is heuristic safety, not a guarantee that every unsafe input is detected.

Tests: the small-talk corpus covers six intents, punctuation/case variants, mixed sensitive inputs and blocked greetings; regression tests cover the FOLLOW_UP rule, transport context, all 1,025 buddy identities, zero provider/quota calls, safe recovery, second-block fallback, cancellation/deadline and quota rejection. The real local browser test checks pending-question resume and preserves the greeting question in captions.

The user's latest instruction explicitly authorizes this chat-handler change, superseding the earlier origin-only function restriction for this bounded fix. No transcription/health handlers, Netlify settings, secrets or hosting commands are changed.

The live gate uses exactly ten synthetic prompts: nine science questions and one greeting. It checks that the greeting is authored with model none in addition to ordinary answer facts and pending-question auto-send. Results will be reported from the rebuilt PR #9 preview before subsequent Stage 6 work.
