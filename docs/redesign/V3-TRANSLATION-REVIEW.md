# V3 language review

All new Sinhala (`si`) and Tamil (`ta`) values in locales.js are machine-translated drafts, generated during the v3 implementation and NOT human reviewed. Grown-ups sees the draft notice before selecting either language. Existing en/si/ta keys remain available; the selected language also controls Valsea transcription. Pokémon names, type labels, catalog controls (except title/search/shiny/status), provider disclosures and mock/science answers remain English at this checkpoint. The six authored activities remain in English, matching the earlier v2 content. Full authored translations and reviewed recordings are still outstanding.

Review every key, especially microphone instructions, permission setup, errors, stopping language and mock disclosure. Check that short button labels fit at 390px, that a child understands them, and that spoken translations match intended scientific meaning. Readex Pro is self-hosted; device fonts supply glyphs outside its coverage. No claim that these drafts are reviewed educational content.

Stage 2 machine-translated keys awaiting native-speaker review: `plantProp`, `fishProp`, `blocksProp`, `shapesProp`, `beeProp`, `storyProp`, `tapHello` in both SI and TA. Core voice controls retain EN/SI/TA. Generation/type filter labels, activity controls and authored scientific content remain English; no claim of complete SI/TA localization.

Stage 3 Part A: `moving`, `artwork`, `tapGiggle`, `tapPeek`, `tapSpin`, `tapWiggle`, `tapStretch` in SI/TA are machine-translated drafts, not human-reviewed. Type names and generation labels remain English with pictograms/color. Every new type button has a word plus visual mark; color alone is never the label.

Stage 3 Part B: `rateLimited` SI/TA captions are machine-translated drafts. The server's deterministic safeguarding/rest/private-data replies remain English, as do generated science answers. Regex safeguarding coverage in SI/TA is limited to a few distress/sensitive keywords and is not a language-safety audit.

Stage 5: `retryReply` and `audioSilent` in locales.js are machine-translated Sinhala/Tamil drafts requiring human review. No safety certification is implied.
