# Stage 2 visual review

Sizes: phone 390×844, portrait tablet 820×1180, landscape tablet 1180×820. Captures use Chromium desktop touch emulation, not physical devices. The small Practice mode label appears only in mock captures; final `*-normal-scene.png` files demonstrate the normal scene without it.

## Review 1

Files: `screens/v3-stage2-round-1/`.

- Official artwork removes the giant pixel-grid appearance while preserving the central Pokémon, always-visible caption and chunky mic.
- Phone Sounds/Story prop words were partly under the caption. Raised the bottom edge of the prop area to 34% of the viewport.
- Landscape chooser needed more grid room. Made its header/filter area use two columns, with six buddy columns and a dedicated scrolling viewport.
- Confirmed no horizontal overflow and no visible buttons under 56px. CDN fetch failures can leave named picture placeholders; screenshots are not evidence of complete source availability.

## Review 2

Files: `screens/v3-stage2-round-2/`.

- A completed plant's yellow light background carried into the fish activity. Clear helper styling at every render.
- Celebration particles could survive into a quickly opened new activity. Clear the activity particle layer on entry.
- Animal-home controls made Reset partly below the phone dialog. Reduced that activity's decorative figure from 105px to 70px on phone; final controls fit.
- Keep the Back to buddy header sticky when an activity needs scrolling, preserving an obvious exit.
- Verified captions, selected buddy identity, semantic type symbols/colors, no cards/menu on the main scene, and a calm recap.

## Delayed-answer layout check

The startup profile did not catch caption growth. A delayed four-sentence reply produced 0.02656 CLS on phone. Reserved 180px phone / 160px tablet caption space, kept its text readable (15px minimum when fitting), and adjusted phone/landscape hero and prop spacing. Caption layout remains fixed; a 220-character response cap complements the existing sentence/word bounds. The complete test reply fits, without scrolling or covering any prop, at all three sizes. The responsive phone artwork is slightly smaller to make room for accessible captions. No large default text input was introduced.

Missing remote art also exposed a badge fallback that could show Pikachu for a different selected buddy. Activity portraits now preserve their space but hide unavailable art, keeping the selected name; tests verify Pecharunt's identity at every size.

## Final inspection

Files: `screens/v3-stage2-final/`.

Normal and mock scenes, chooser, listening/thinking/speaking, all six activity introductions on phone, plant introduction/recap on all three sizes, and calm ending. Final capture checks: no page exceptions, no horizontal overflow, all visible buttons >=56px, page scroll stays at 0. The game itself still offers vertical dialog scrolling where needed.

Before/after hero comparisons use Stage 1 `screens/v3-final/` and Stage 2 `screens/v3-stage2-final/`. Artwork is the actual locally compressed PokeAPI official asset, not an AI recreation.

Tap proof: `screens/v3-stage2-tap/`. Playwright taps the real buddy, then freezes its actual CSS animations at 100/350/650/900 ms for reproducible screenshots. At 100ms the transform is approximately scale(1.18,0.82), at 350ms it is 65px above rest with stretch/tilt, and at 650ms it squashes on landing. Seven particles maximum; repeat taps replace that layer. Reduced motion turns animations off and keeps “Hee-hee!” as visible feedback. This is a controlled frame sequence, not a measured frame-rate video.
