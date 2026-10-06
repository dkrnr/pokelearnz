# Stage 2: backend observations and child risks

Read-only review of all three `netlify/functions/*.js` files. They remain byte-for-byte unchanged from the Stage 1 checkpoint. No provider request, secret inspection, Netlify configuration change or deployment was performed. This is a code review, not a provider-policy or live-model audit.

## Chat: `netlify/functions/chat.js`

1. **No server-enforced child safety prompt.** The handler forwards the caller's `messages` array. A modified client can omit/replace the system instruction or inject arbitrary roles. The browser's prompt and bounds cannot secure this public endpoint.
2. **No input or output moderation.** Successful upstream response text is returned wholesale. Sexual/violent content, harassment, stereotypes, dangerous instructions, emotional dependency, personal-data requests, inaccurate science, and unsuitable medical/mental-health advice could reach a child. The front end's keyword checks, four-sentence limit and eight-word check are narrow heuristics; short harmful answers can pass. Translated/obfuscated content is particularly weakly covered.
3. **Unreviewed routing.** The request configures `google/gemma-4-31b-it:free`, with `nvidia/nemotron-3-super-120b-a12b:free`, `inclusionai/ling-3.0-flash-fin:free` and `openrouter/free` in the fallback list. A free-router path does not fix the downstream model/host. No child-suitability evaluation, pinned model revision, provider allowlist or routing/region/retention restriction is present in the code. Their actual API routing behavior was not tested.
4. **No semantic validation of messages.** Only `Array.isArray` is checked. Individual roles/content, empty input, message count and lengths are unconstrained. A client can bypass the UI's 300-character bound, supply histories or system messages, and increase latency/cost or unsafe context.
5. **No output token/response-size budget.** The request has no token cap. UI rejection happens after generation/download, so an excessively long answer can still consume resources and cause waiting or failure.
6. **Character prompts are not independently vetted.** The frontend uses the main branch's large personality file before appending safety instructions. Those character instructions and model compliance are not an assurance of accurate, child-appropriate responses.
7. **Questions/transcripts go to a third-party chain.** Netlify proxies to OpenRouter, which can use downstream inference providers. No server-side PII removal, retention/deletion control, provider-specific consent or child-data handling restriction is implemented. The app does not persist questions locally; this says nothing about provider logs or storage.

## Transcription: `netlify/functions/transcribe.js`

8. **Recorded child voice leaves the device.** The body is decoded and forwarded to `api.valsea.ai/v1/audio/transcriptions`. Voice may contain names, addresses, family conversations or other identifiers. No redaction, deletion endpoint or retention control is present. The selected language travels in the client-supplied multipart body.
9. **Content-type presence is the only media validation.** The function does not parse/validate multipart fields, format, recording duration, size, model or language. The client limits duration and blob size, but direct requests bypass that. The local development server's 12 MiB limit is not a validation rule in the deployed function; platform limits were not verified.
10. **Transcript is not moderated or confirmed.** `data.text || ''` is returned, with no type/length/safety validation. The current frontend checks for a string but then sends its content as a question. Child pronunciation, background voices or STT hallucination can change intent; there is no transcript confirmation before uploading it to OpenRouter.
11. **Binary forwarding deserves live verification.** The handler depends on Netlify's base64/body encoding and forwards the original Content-Type/boundary. Real iOS/Android recording formats, request limits and upstream transcription behavior were not tested.

## Sentiment: `netlify/functions/sentiment.js`

12. **An unused sensitive endpoint remains exposed.** The current frontend sends no sentiment requests, but the handler accepts any string and forwards it to Valsea's sentiment API (`model: valsea-sentiment`). Another caller can send a child's transcript for emotional classification without the UI's permission check. There is no length bound, moderation, interpretation safeguard or server consent check. No sentiment output is used to shape this redesign.

## All three handlers

13. **No server authentication, consent enforcement or abuse limiter.** Each accepts POST without validating an authorized session, parental consent, caller origin or quotas. The arithmetic gate is a UI guard, not authentication. Direct requests can incur charges, exhaust free limits and make the buddy unavailable.
14. **No upstream timeout or cancellation signal.** Each upstream fetch can outlive the UI's 15-second abort, including after Sleep, a buddy change or consent withdrawal. Browser cancellation does not establish that processing/data transmission stopped on the server/provider.
15. **429 retries duplicate a request.** Each handler retries once after 600 ms. Recorded voice or a question may be transmitted twice; the code supplies no idempotency key or retry consent boundary. Further overload can still produce failure.
16. **Upstream fetch failures are not caught locally.** Network exceptions can escape the handler. Missing keys, invalid bodies and upstream failures interrupt learning; the UI uses calm captions, but availability remains uncertain.
17. **Raw diagnostic text is returned.** Upstream errors include the first 500 characters of their response body. Such text could contain unsuitable diagnostics or echoed input. No secret leak was observed or tested; the current UI deliberately does not display that raw body.
18. **No explicit response privacy headers in the functions.** They set Content-Type, but no Cache-Control/privacy policy. The service worker explicitly excludes every function request; the local server adds no-store. Actual Netlify/proxy behavior and provider logging/retention were not verified.
19. **No robust response schema validation.** Chat returns upstream text verbatim. Transcribe/sentiment parse JSON but loosely select fields. Malformed/unexpected provider data produces omissions or frontend failures, with no explicit server fallback suitable for a child.
20. **No validated crisis/safeguarding pathway or factual grounding.** There is no server-side handling for abuse disclosures, emergencies or sensitive personal questions, no references/fact verification, and no proof that model stopping/relationship boundaries hold. The frontend offers a trusted-grown-up caption on detected input; that is limited protection.

These findings need a separately authorized backend pass and live/provider review. This Stage 2 work does not certify the backend safe for unsupervised children. Authored activities and `/?mock=1` do not use these handlers.
