These three tiny synthetic 440Hz tones contain no speech or child audio. Generated with the installed FFmpeg solely to test binary validation / optional live compatibility smoke. They are not recordings from actual devices.

    ffmpeg -f lavfi -i sine=frequency=440:duration=1 -c:a libopus chrome.webm
    ffmpeg -f lavfi -i sine=frequency=440:duration=1 -c:a aac -movflags frag_keyframe+empty_moov+default_base_moof safari.m4a
    ffmpeg -f lavfi -i sine=frequency=440:duration=1 -c:a aac audio.m4a

Browser MediaRecorder WebM is separately captured from a synthetic stream by `tests/v3-voice.mjs`. The fragmented M4A fixture exercises the Safari-like ISO BMFF container, not a claim about a physical iOS capture. MP4 is sent as an M4A filename with audio/mp4, matching Valsea's documented M4A support. Real devices/codecs/provider acceptance still need live testing.

Stage 8 adds `too-short.webm` and `too-short.m4a`, 0.2-second excerpts of the existing synthetic `core-question.wav`, encoded with local FFmpeg. They verify the 0.7-second minimum before any provider send. These contain synthetic TTS, not children's speech.

    ffmpeg -i core-question.wav -t 0.2 -c:a libopus too-short.webm
    ffmpeg -i core-question.wav -t 0.2 -c:a aac too-short.m4a
