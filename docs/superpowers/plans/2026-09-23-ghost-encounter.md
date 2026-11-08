# Ghost encounter and performance implementation plan

Goal: replace the mannequin-like accident ghost, remove retreat oscillation and stutter sources, and align the entrance evidence, reveal and escape with audible events.
Architecture: retain the existing Three.js gameplay, continuous character rig and story state machine. Rebuild character surfaces and silhouette; optimize deformation and static scene submissions. Reuse audio mixer with a pre-rendered original stereo chase score.

- [x] Reproduce route reversal and baseline CPU/browser performance. Add failing regression assertions for redundant route corners and absent wet-impact cue.
- [x] navigation.ts/game.ts: radius-safe path simplification, stable destination routing and bounded angular turns. Full interaction walkthrough must still reach the ending.
- [x] world.ts/game.ts/story.ts: closed front door during interior reveal; ghost physically traverses the utility doorway; automatic opening on escape approach, collision clears after the leaf. Positional wet-shoe impact and creak use effects volume.
- [x] ghost*.ts/materials.ts: new asymmetrical face, damaged silhouette, blood-stained wet cotton and skin, floor-contact crawl. Reduce allocation and redundant deformation without weakening contact/clearance assertions.
- [x] audio.ts + public/audio: original stereo low strings, brass-like swells and layered percussion; dynamic pursuit mix with manual pause/mute respected.
- [ ] Inspect standing/crawl/attack and actual apartment/stair/gallery scenes; measure before/after on identical browser path, review final diff independently, run full tests/typecheck/build.
- [ ] Publish to the existing public Site and report its confirmed successful URL.

Assets: built-in image generation, no external copyrighted characters. Face prompt: adult Korean female ghost practical-effects albedo, gaunt asymmetric eyes and cheeks, pale skin, purple discoloration, a few dark dried stage-blood streaks, intact skin, no open wounds. Surface prompt: four equal quadrants of gray skin-like silicone, wet black hair, rain-soaked old ivory cotton with irregular red-brown stains, and glossy stage-blood paint. Generated PNGs are copied into public/textures/ghost-face-v4.png and ghost-surfaces-v4.png. No generated concept is presented as a game screenshot.

## Verification before publication

- 102 tests pass, including the full interaction route to the fatal ending, physical door/elevator thresholds, hidden utility-room reveal, pursuit contact, wardrobe escape, limbs touching the floor, architecture batching and deferred GPU cleanup during shader compilation.
- `npx tsc --noEmit` and `git diff --check` pass.
- Actual Chrome app: ready/start, opening skip, manual pause; no page or console errors.
- Actual Chrome Web Audio: stereo chase WAV decoded (30.4761875 s), looping, running/suspend/resume, frozen audio clock on pause, music mute; no errors. Immediate game disposal during real shader compilation also completes without errors.
- Independent review found and verified fixes for indexed/non-indexed batching and premature shader-resource disposal. No blocking findings remain.
- Matched 1280×720 Chrome corridor chase, 12 seconds: CPU/update+render-submission median 7.2 → 1.6 ms; p95 8.4 → 2.3 ms; render calls 372 → 128; triangles 69,984 → 57,820. Frame interval median remains 16.7 ms (display limited); maximum observed frame interval 33.4 → 16.8 ms. This is a controlled local comparison, not a guarantee for every device.
- Final build and publication are performed by the Sites workflow after these checks. Performance measurements and captures remain local QA artifacts, not shipped game content. Browser timing does not guarantee all devices will run without stalls.
