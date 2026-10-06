# Stage 1 visual review

Viewports: phone 390×844, tablet portrait 820×1180, tablet landscape 1180×820. The browser uses touch emulation and normal motion, so idle and speaking screenshots show different sprite frames. All rounds contain scene, listening, thinking, speaking and chooser images at each size. Final captures wait for every visible chooser sprite to finish loading.

## Review round 1

Inspected the phone scene/chooser/speaking state and tablet portrait/landscape layouts. Problems: the phone viewport shifted during repeated mic taps; captions changed height; animated sprite ears touched the label on landscape; compact chooser sprites appeared tiny, and replacing them with large Home pictures caused slow/blank loading. The review included a preliminary phone capture before the stored complete round.

Fixes: reserved caption space, disabled document scroll anchoring, increased portrait buddy width, kept the chooser DOM bounded to 24 entries, and changed chooser thumbnails back to compact CDN files in larger frames. Adjusted landscape label/character positioning. Updated capture navigation to wait for app readiness rather than every background image request. The retained round-1 set includes the unsuccessful large-image experiment; blank tiles are the finding, not final screenshots.

## Review round 2

Inspected phone scene/listening/speaking/chooser, tablet portrait scene, and landscape scene. Remaining problems: hover transforms on a touch device caused Playwright's second tap to scroll the phone; enlarging compact sprite frames clipped some large creatures; the phone buddy could fit the available scene better; permissions remained true until asynchronous cache clearing finished.

Fixes: disabled hover transforms on touch devices, reduced thumbnail enlargement from 150% to 125%, moved the phone label upward and returned its buddy stage to 50% of viewport height, adjusted the landscape stage to about half-height, made permission withdrawal immediate, and required visible images to be loaded before final screenshots.

## Final inspection

Manually inspected phone scene/speaking/chooser, tablet portrait chooser, landscape scene/speaking, plus phone listening/thinking and tablet portrait scene/speaking. Phone headers stay visible throughout voice states. Full answer captions remain readable, the mic stays in the scene, and chooser pictures/types are visible. The landscape buddy sits in front of the hills, with captions in the foreground. There are no activity cards or tabs.

All three capture logs: no page exceptions, no horizontal overflow, no visible button under 56px, scroll position 0 when opening chooser. Automated WCAG A/AA scans pass scene, chooser, keyboard and grown-ups. Separate reduced-motion smoke verifies still images, mock transitions, EN/SI/TA draft labels, one-time setup, search #1025, shiny, pagination, recent shelf, safe stopping, cancellation and offline visited sprites.

Artifacts:

- `screens/v3-round-1/`: 15 images, first complete review capture.
- `screens/v3-round-2/`: 15 images, after first review fixes.
- `screens/v3-final/`: 15 images, after second review fixes.

Regenerate with `REVIEW_ROUND=v3-review npm run screenshots:v3` while the built local server runs. These screenshots are deliberate requested review deliverables; temporary test output, node_modules, dist and secrets are excluded from commits.
