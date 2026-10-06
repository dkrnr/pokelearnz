# Stage 2 performance budget and first milestone

Budget: LCP < 2,500 ms on Lighthouse mobile with real DevTools 4× CPU slowdown and a 1,638 Kbit/s / 150 ms latency network profile; zero layout shift; no tasks longer than 100 ms during tablet chooser scrolling. Three fresh-browser runs; compare medians. Actual phone/tablet behavior still needs device testing. Lighthouse 12.8.2 was installed from the existing npm cache after current-version dependency downloads timed out. No profiler dependency entered the app bundle.

Stage 1 baseline is the unchanged `7e29bf5` build, served separately at port 4185. The optimized build is at 4186. Settings and reproducible harness: `scripts/profile-mobile.mjs`. Raw Lighthouse JSON/HTML are ignored local artifacts in `qa/artifacts/performance/`, not committed test output.

| Metric | Before | Performance milestone |
| --- | ---: | ---: |
| Lighthouse mobile reported LCP, median | 665 ms **incomplete** | 969 ms, hero image |
| LCP range | 654–700 ms **incomplete** | 960–993 ms |
| CLS, median | 0.001292 | 0 |
| Total blocking time | 0 ms | 0 ms |
| Transfer, typical run (incl. shell setup) | 625 KB | 279 KB |
| Chooser opening, 4× CPU | 127 ms | 141 ms |
| Scroll tasks >100 ms | 0 | 0 |

The baseline's superficially good LCP is NOT a useful hero-ready comparison: all three Lighthouse runs warned that the page loaded too slowly to finish, selected decorative grass as LCP, and waited on the CDN animated image. The optimized reports complete without warnings and select the actual buddy image. Do not claim a numeric LCP speed-up from those unlike candidates. The initial chooser remains paginated at this milestone; final scrolling-grid measurements will be recorded after feature work.

Fixes made BEFORE adding features:

- Official hero artwork with a 21 KB locally bundled default Pikachu image (118 KB source PNG → 20,588-byte WebP). Other heroes request official-artwork from the existing disclosed CDN; Home art is fallback. Grid keeps tiny PNG sprites. No full collection is bundled.
- Preloaded/high-priority, eager, explicitly sized hero image, mounted once and reused. Preconnect to sprite CDN from the buddy module. Stable scene dimensions prevent image-driven layout shift.
- Catalog and O(1) ID index load independently of the large personality file. Personalities are fetched only for an actual live question, with cancellation rechecked before upload.
- Lossless self-hosted WOFF fonts: 129/136 KB TTFs → 64/68 KB WOFFs. Standard-library reproducible conversion; all glyph tables retained. Optional font display avoids late font swaps shifting controls.
- No continuous idle bob, no GIF in the hero. Short random idle motions use CSS. Filters/backdrop blur removed, box-shadow transitions removed. Animations use transform/opacity only. Hero motion pauses under dialogs. At most buddy + listening ring run continuously during a voice state; idle has no continuous animation. Reduced motion still disables motion.
- Chooser cells use content-visibility/containment and asynchronously decoded, lazy images.

Run while a built server is running:

    POKELEARN_TEST_URL=http://127.0.0.1:4186 PROFILE_LABEL=final \
      LIGHTHOUSE_DIR=/tmp/pokelearn-lighthouse-12 node scripts/profile-mobile.mjs

Install Lighthouse 12.8.2 in the selected temporary folder if reproducing elsewhere. Host CPU, CDN routing, local server compression and cache state affect results; these are laboratory runs, not field data. First-time selection of an unvisited remote buddy may still depend on CDN response time. Only the default hero is locally bundled for predictable first paint.
