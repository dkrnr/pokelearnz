# Three-minute employer walkthrough

Open [the authored demo](https://pokelearnz.netlify.app/?demo=1) before the meeting. `?demo=1` forces prepared chat answers and a kind fallback for questions outside the bank. It does not demonstrate fresh AI quality. Typing avoids voice uploads; the mic still sends audio to Valsea after consent. Keep sound off unless the device's read-aloud works. Use invented science questions only.

| Time | Action and talk track |
| --- | --- |
| 0:00–0:25 | Show the calm scene, visible captions and large controls. “This university project explores short learning moments for ages 6–9. There are six activities with endings, and no points, streaks or ads.” |
| 0:25–0:55 | Tap **Type**, enter **Why are leaves green?**, and send. On a fresh device solve the grown-up arithmetic check, open setup and enable online questions. The pending question sends once. “The gate is a device setting, not proof of parental consent. Demo mode uses authored answers.” Point out **AI can be wrong, ask a grown-up.** |
| 0:55–1:20 | Ask **What do axolotls eat?** using Type. These exact questions hit the 95-answer bank. Other reliable alternatives: **Why is the sky blue?** and **What is gravity?** Avoid improvising a model question during the interview. |
| 1:20–1:45 | Open **Change buddy**. Show generation/type filters and search **Eevee**. Pick Eevee. “All 1,025 names and types are bundled; the list is virtualized, and pictures have a fallback.” |
| 1:45–2:20 | Tap **Blocks**. Add three blocks, tap **Check**, then **Next**. Explain that groups of five and four finish the activity. “This is authored, finite content; it works offline after the first visit.” Return with **Back to buddy**. |
| 2:20–2:35 | Tap **Sleep** and wait for the ending. “Stopping is part of the design. There is no reward for staying.” |
| 2:35–3:00 | Open [/parents](https://pokelearnz.netlify.app/parents). Show voice consent, the data flow and AI limits. “Text checks and the 24-hour cache cannot verify facts. Child usability, provider age terms and physical-device voice still need review.” End with the README's architecture and verified/unverified evidence available for follow-up. |

On the current production site, Stage 7 changes appear only after owner review and release; do not promise the new note/TTL before then. Use this PR's automatic preview to review the new version. No merge or manual deployment is part of this walkthrough.

## Rehearse and record locally

```sh
npm run build
npm start
# Open http://127.0.0.1:4178/?demo=1 and follow the table.
# In a separate terminal, after installing Playwright Chromium and ffmpeg:
npm run record:demo
```

The recording command starts its own loopback server, records a Playwright WebM, and converts it with ffmpeg to [the README GIF](portfolio/demo.gif) (720-pixel width, 8 fps). It shows an actual authored-bank answer, chooser, one activity step, Sleep and the parent guide in about 20 seconds. It uses saved device opt-in, so the gate is covered by the walkthrough and browser regressions rather than the clip. The WebM/provenance stays under ignored `qa/artifacts/demo-video`. The script loads no `.env`, blocks external pictures, sends one synthetic forced-demo chat request and uploads no microphone audio.

The GIF is interaction evidence, not live provider or learning-outcome evidence. Do not record real child conversations or expose credentials/debug details. To test fresh providers, use the separate one-run, at-most-three-question live harness only with an explicitly authorized budget.
