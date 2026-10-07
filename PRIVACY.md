# Privacy and processing

The current build-generated [privacy page](https://pokelearnz.netlify.app/privacy) is authored in `scripts/static-pages.mjs`. This is a university demo; children should not enter personal information. See also [the parent guide](https://pokelearnz.netlify.app/parents).

Audio goes to Valsea. Questions can use an authored bank or a validated answer cache, then Groq and OpenRouter. Free AI providers may retain or train on questions depending on their policies and account settings. Provider controls have not been audited or changed.

The app stores no raw questions, transcripts or recordings. Netlify Blobs stores a capped, PII-screened answer cache with HMAC-derived question keys, answer/model/provider/expiry metadata, quota counts, daily salted IP hashes and an OpenRouter reset timestamp. Answer serving expires after 30 days; cleanup happens on later activity, so dormant records may remain stored longer. Text screening is heuristic. Device storage remembers permission/language and optionally buddy choices; the offline cache holds public files and visited images. Clearing device data cannot delete server/provider records.

Policies: [Netlify](https://www.netlify.com/privacy/), [Valsea](https://valsea.ai/policies/en), [Groq](https://console.groq.com/docs/your-data), [OpenRouter](https://openrouter.ai/docs/guides/privacy/provider-logging), [jsDelivr](https://www.jsdelivr.com/terms/privacy-policy).

Remaining reviews include child-service provider terms, consent, retention behavior, multilingual safety, real devices and supervised usability. This is not a guarantee of zero retention, complete moderation or factual accuracy.
