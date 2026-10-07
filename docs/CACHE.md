# Answer cache operations

Cached model answers are unverified. Output/PII checks do not establish factual accuracy. A wrong answer can still pass. Serving lasts at most 24 hours, with a 256-entry/256-KiB cap. Answers shorter than 40 characters or eight words, or containing uncertainty/hedging phrases (including “I'm not sure”, may, might and could), are rejected on reads and writes. This conservative rule can exclude useful answers too.

## Invalidate serving

`CACHE_VERSION` is a server-only environment variable, default `2`. Choose a **new, never previously used** value (1–64 letters, digits, underscores, dots or hyphens) for each incident, e.g. `science-review-20261007`. The version is included in both HMAC keys and entry metadata. An invalid value disables answer caching. All live function instances must receive the new version before invalidation is complete; do not reuse an earlier value.

The v2 code reads only `answer-cache-v2`. It never reads `answer-cache-v1`, even if an old 30-day expiry is still valid. That makes the code release invalidate Stage 6's cache without any Netlify setting change. Expired, wrong-version and ineligible entries are pruned on subsequent cache activity. Dormant blobs can remain stored; invalidation/TTL is not physical deletion.

Changing deployed environment values or releasing code is an owner operation. Stage 7 does not change Netlify settings or deploy manually. `GROQ_MODELS`, if explicitly configured in an environment, overrides the new code defaults; use `openai/gpt-oss-120b,openai/gpt-oss-20b` at the next authorized configuration review.

## Physically purge application answer blobs

Run from **dkrnr/pokelearnz only**. Privately supply `NETLIFY_SITE_ID` for the existing pokelearnz site and a short-lived `NETLIFY_AUTH_TOKEN` with access to that site, using ignored `.env` or a secret manager. Never paste tokens into commands, screenshots or reports. The script never prints values or reads answer content.

1. Confirm the site ID privately against the existing site's dashboard. The script cannot infer that an arbitrary supplied ID is the correct site.
2. Review a dry run: `npm run cache:purge -- --dry-run`.
3. After incident-owner authorization, run `npm run cache:purge -- --apply`.
4. Run the dry run again to confirm no matching blobs remain. Remove/revoke a temporary operations token.

The script lists **all pages** in `pokelearn-ai-budget` and deletes only exact `answer-cache-v<number>` blob names, including v1 and v2. It preserves `day-*` quota counters and `provider-state-v1`, so a purge cannot renew inference capacity or clear a daily-limit pause. Default mode only lists candidate names. Purging a whole store is unnecessary and unsafe for quotas.

Active functions can write new answers during a purge. To retire an incident's answers reliably, use a new version across all instances first, then purge during an owner-approved quiet window. This does not delete provider/platform logs or data in backups. The script was tested with paginated fixtures; no hosted purge was performed for Stage 7.
