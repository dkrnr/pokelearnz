# Authored narration

Optional studio recordings live here. No child audio belongs here.
`authored-audio.js` maps stable authored-line keys to same-origin MP3, WAV or OGG files.
The player shows the complete caption before audio, and plays only after a child enables Read aloud or deliberately uses the microphone. Missing/failed recordings fall back to a local device speechSynthesis voice, then silently to captions. There is no cloud TTS call.

Keys: `<activity>.intro`, `<activity>.prompt.<zero-based-step>`, `<activity>.fact.<zero-based-step>`, `<activity>.recap`.
For example `plants.intro` must narrate exactly:
“Build a happy plant home. Give the leaves some light.”

The initial manifest has no recordings. A local Flite synthesis attempt could not fetch the required package in this environment; human narration remains to be recorded and reviewed. The audio path is tested with a generated local WAV fixture, including failure fallback, muting and closing a lesson.
