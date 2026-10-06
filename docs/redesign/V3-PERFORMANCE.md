# Stage 2 performance budget and before/after results

Budget: LCP < 2,500 ms on Lighthouse mobile with real DevTools 4× CPU slowdown and a 1,638 Kbit/s / 150 ms latency network profile; zero layout shift; no tasks longer than 100 ms during tablet chooser scrolling. Three fresh-browser runs; compare medians. Actual phone/tablet behavior still needs device testing. Lighthouse 12.8.2 was installed from the existing npm cache after current-version dependency downloads timed out. No profiler dependency entered the app bundle.

Stage 1 baseline is the unchanged `7e29bf5` build, served separately at port 4185. The first performance milestone is at 4186; the final source `c97cce0` was measured at 4187. Settings and reproducible harness: `scripts/profile-mobile.mjs`. Raw Lighthouse JSON/HTML are ignored local artifacts in `qa/artifacts/performance/`, not committed test output.

| Metric | Before | Performance milestone |
| --- | ---: | ---: |
| Lighthouse mobile reported LCP, median | 665 ms **incomplete** | 969 ms, hero image |
| LCP range | 654–700 ms **incomplete** | 960–993 ms |
| CLS, median | 0.001292 | 0 |
| Total blocking time | 0 ms | 0 ms |
| Transfer, typical run (incl. shell setup) | 625 KB | 279 KB |
| Chooser opening, 4× CPU | 127 ms | 141 ms |
| Scroll tasks >100 ms | 0 | 0 |

The baseline's superficially good LCP is NOT a useful hero-ready comparison: all three Lighthouse runs warned that the page loaded too slowly to finish, selected decorative grass as LCP, and waited on the CDN animated image. The optimized reports complete without warnings and select the actual buddy image. Do not claim a numeric LCP speed-up from those unlike candidates. The initial chooser remains paginated at this milestone; the completed virtual-grid measurements are below.

Final source measurement, three fresh-browser runs of `c97cce0`, after all feature/stopping/search fixes:

| Metric | Stage 1 before | Stage 2 final |
| --- | ---: | ---: |
| Reported mobile LCP, median | 665 ms **incomplete; scenery** | **1,070 ms; hero** |
| LCP range | 654–700 ms **incomplete** | 1,067–1,091 ms |
| Lighthouse performance score | 100 **incomplete** | 100; no warnings |
| Startup CLS | 0.001292 | **0** |
| Total blocking time, median | 0 ms | 0 ms |
| Audited transfer, median (range) | 625 KB | 301 KB (247–301 KB) |
| Chooser opening, 4× CPU | 127 ms (24-item page) | 112 ms (virtual grid) |
| Scroll tasks >100 ms | 0 (paginated baseline) | **0** (7,800px scroll) |
| Mounted tiles after scroll | 24 | **20**, of 1,025 |

Final budget checks pass. A separate delayed four-sentence answer check caught 0.02656 CLS on the earlier Stage 2 phone build; fixed caption space now gives 0 CLS on phone, portrait and landscape, with the entire test answer fitting and every prop clear of the bubble. This additional check is in `tests/v3-caption.mjs` (not a Lighthouse cold-run metric). The Long Tasks API reports entries >=50ms: no such entries were observed during the final scroll, so the recorded maximum is 0, not a claim that each frame/task took zero time. The original 43-page chooser is not a comparable continuous-scroll workload. Wheel motion tested at tablet portrait 820×1180 with 4× CPU; no field FPS or touch-inertia claim is made.

Baseline hero network evidence: run 1's GIF finished at 41,657ms; run 2 was still incomplete at 9,719ms; run 3 failed at 30,989ms. All three Lighthouse reports warned of unfinished loading. Those failures reflect this observed CDN/network path, not a general assertion that every GIF always takes that long. Default artwork now comes from the same app host and is the real LCP candidate.

Warm-cache supplementary check: service-worker-controlled reloads with 4× CPU had LCP 68/64/64ms (median 64ms). This is a separate Playwright/CDP measurement, not a Lighthouse cold-run score. Network emulation targets the page; a service worker's own navigation fetch may bypass that target's throttle. Treat this as evidence of a fast cached shell, not a directly comparable 150ms-network guarantee. Do not use `observedAtMs` (the later sampling time) as hero decode/paint latency.

Fixes made BEFORE adding features:

- Official hero artwork with a 21 KB locally bundled default Pikachu image (118 KB source PNG → 20,588-byte WebP). Other heroes request official-artwork from the existing disclosed CDN; Home art is fallback. Grid keeps tiny PNG sprites. No full collection is bundled.
- Preloaded/high-priority, eager, explicitly sized hero image, mounted once and reused. Preconnect to sprite CDN from the buddy module. Stable scene dimensions prevent image-driven layout shift.
- Catalog and O(1) ID index load independently of the large personality file. Frontend personality parsing/use is deferred to a live question, with cancellation rechecked before upload. The final shell also removes this file from service-worker precaching.
- Lossless self-hosted WOFF fonts: 129/136 KB TTFs → 64/68 KB WOFFs. Standard-library reproducible conversion; all glyph tables retained. Optional font display avoids late font swaps shifting controls.
- No continuous idle bob, no GIF in the hero. Short random idle motions use CSS. Filters/backdrop blur removed, box-shadow transitions removed. Animations use transform/opacity only. Hero motion pauses under dialogs. At most buddy + listening ring run continuously during a voice state; idle has no continuous animation. Reduced motion still disables motion.
- Chooser cells use content-visibility/containment and asynchronously decoded, lazy images.

Run while a built server is running:

    POKELEARN_TEST_URL=http://127.0.0.1:4187 PROFILE_LABEL=final \
      LIGHTHOUSE_DIR=/tmp/pokelearn-lighthouse-12 node scripts/profile-mobile.mjs

Install Lighthouse 12.8.2 in the selected temporary folder if reproducing elsewhere. Host CPU, CDN routing, local server compression and cache state affect results; these are laboratory runs, not field data. First-time selection of an unvisited remote buddy may still depend on CDN response time. Only the default hero is locally bundled for predictable first paint.

Method references: [Lighthouse throttling documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) and [Chrome performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). The script selects `devtools` explicitly instead of simulated CPU timing. Raw reports remain local ignored QA output; the table is the committed review artifact.

Audited transfer varies with background shell setup/request attribution; the final three values were 300,528 / 300,528 / 247,398 bytes. It is a reported laboratory metric, not a fixed complete install size.
