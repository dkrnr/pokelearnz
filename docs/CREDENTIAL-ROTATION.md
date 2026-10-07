# Historical credential rotation (owner action)

The migration handoff and GitHub push-protection checkpoint identified an **OpenAI-style API secret key** in historical `config.js`. It was removed from the rewritten publication history. The owning account/project, whether the key was still valid, and whether it has already been revoked are not independently verified. No credential value, fragment or private audit is included here. Do not inspect or republish recovery mirrors to retrieve it.

1. Sign in to the owning OpenAI Platform account. Select the organization/project that issued the historical key; ask its administrator if it is not visible.
2. Open [API keys](https://platform.openai.com/api-keys). Identify the affected key using private owner records (key name/creation date), and revoke/delete it immediately. If identification is uncertain, revoke all potentially affected keys in that project and replace the ones still needed. History redaction does not revoke a key.
3. Review the project's [Usage](https://platform.openai.com/usage) and billing for unexpected requests/charges during and after exposure. Record the incident privately; contact OpenAI support if misuse is suspected.
4. Only if an active service still needs OpenAI, create a new key in the correct project with the least permissions needed. Save it in a secret manager; never in browser code, a tracked file or a shell command. PokeLearn currently uses Groq/OpenRouter/Valsea and does not require a direct OpenAI key.
5. Replace the revoked key in every actual consumer: private local environment, CI secret store and hosting secret store. Remove stale copies from unused environments. Hosting changes and any required restart/release are separate owner actions, not authorized by this Stage 7 work.
6. Verify the consumers use the replacement through their normal health checks; confirm the old key is absent/revoked in the dashboard. Do not test a known leaked key or paste it into a request. Remove temporary copies, and keep recovery backups private.

Sources: [OpenAI API key safety](https://help.openai.com/en/articles/5112595-best-practices-for-api), [official production guidance](https://developers.openai.com/api/docs/guides/production-best-practices). Revocation remains unverified until the owner checks the dashboard.
