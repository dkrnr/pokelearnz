/** Current voice-first regression entry point; hard-no checks also remain in policy.test.mjs. */
await import('./v3-smoke.mjs');
await import('./v3-activities.mjs');
await import('./v3-safety.mjs');
await import('./v3-caption.mjs');
