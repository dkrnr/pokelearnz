# Visual reviews

Viewport emulation: phone 390×844, tablet portrait 820×1180, tablet landscape 1180×820. Screenshots use those viewport sizes and capture the full page. These are desktop Chromium screenshots, not observations of children or physical devices.

## Round 1 → fixes
Inspected phone shelf, plant and story, plus landscape shelf. The original vector pictures and leaf buddy provide clear choices, and the card palette is warm. The phone's full-height welcome panel pushed lesson tools too far down. Story choices touched their work area. Plant helpers also disappeared on advancing a step.

Fixes: compact buddy panel in activities, question and recap screens; space story choices; retain earlier plant helpers; restore keyboard focus after activity updates; shorten and clarify authored notes and remove answer-revealing picture icons from phonics choices.

## Round 2 → fixes
Inspected phone plant, sorting, question failure and grown-ups; portrait shelf; landscape completion. The smaller activity header makes the main tools visible sooner. No horizontal overflow at the requested sizes. The landscape completion bubble overlapped the buddy's raised pose, and the parent's close control would scroll out of view. The question actions sat too close to the text field.

Fixes: retain enough internal stage height for the raised buddy and position the phone bubble above its leaf; make the parent dialog header sticky; add space below the question field. Semantic accessibility labels and the blocked-storage notice were also corrected after automated checks.

## Final inspection
Final screenshots are in `screens/final/`. Inspected all six phone activities, phone goodbye and completion, portrait completion and story, and landscape shelf and plant. Activity tools remain large and readable; finite completion and the real-world suggestion are clear. The shelf scrolls naturally on phones and portrait tablets. Long parent details scroll inside the modal with Close remaining available.

Ages 6–9 and 3–5 minute lesson pacing are design assumptions, not validated child-usability results. Real children, physical devices, Sinhala/Tamil wording and real provider responses remain unverified.
