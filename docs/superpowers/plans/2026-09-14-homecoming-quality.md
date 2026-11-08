# Homecoming quality implementation plan

Approved design: the commercial-quality review and the user's instruction to implement it, 2026-09-14. Execute inline in the existing isolated checkout. Preserve the published story, reference ghost, dark apartment, manual pause and current Site audience.

## Deliverables
- [x] Player-led wardrobe timing, coherent directional sight and audible movement, differentiated pursuit with a quiet investigation interval.
- [x] The victim's 1704 apartment with three environmental clues, an answering-machine memory, an interrupted return through the same space, and an exit into the existing archive.
- [x] A playable rain-soaked accident epilogue: open the car door, investigate the victim's belongings, call for help and stay, replacing the text-only loop ending.
- [x] Device-local chapter checkpoints with validated saves, persistent preferences, FOV, subtitle scale, reduced effects, split audio and key rebinding. Preserve previous save when storage fails.
- [x] Environmental dressing, readable low lighting, differentiated floor sounds, occluded ghost voice, asymmetric grounded gait and restrained death framing.
- [x] Integration route, navigation reachability, vision/noise, storage corruption/reload, and pause regressions; typecheck and browser review.

Validation: 58 automated tests pass; TypeScript passes. Browser review covered the opening, continue, settings, live key rebinding, 1704 and the accident scene. Temporary scene-review route was removed and the previous browser-local save and viewport restored. Read-only review findings about elevator checkpoints, freed key bindings, resident patrol paths and seated keyboard look were addressed. Release uses the production build and the exact pushed source through Sites.

Limits: narration currently uses a synthesized Japanese voice. Lighting and meshes remain within the existing procedural Three.js style. Outside player testing, performance benchmarks across target hardware, professional voice acting and a measured 60–90 minute duration remain future production work.

## Implementation sequence
1. Extend `lib/story.ts` with `resident_entry`, `resident_memory`, `resident_return`, `road_exit`, `road_evidence`, `road_call`, `road_wait`. Keep guilt explicit. Add `resident`, `aftermath` areas. Test transition and required evidence guards first.
2. Add resident/aftermath geometry through the existing world builder. Use reachable targets named `belongings`, `answerphone`, `resident_leave`, `car_door`, `road_bag`, `road_phone`, `stay`. Keep collision shapes aligned with visuals. Extend navigation tests for each area.
3. Change the existing wardrobe flow without teleporting: exit from `wait` enters `escape`, re-entry restarts physical approach, the audio cue is information without an escape order. Use a 120-degree forward vision cone plus close contact and sound detection. Test front/back/occluded vision and early exits.
4. Add small `lib/preferences.ts` with validation for settings and chapter saves. Save only safe chapter boundaries and earned notes; continue reconstructs each area's spawn and local interaction state. Invalid/old data is ignored safely. Test roundtrip, corrupted data, finished/death states and settings clamps.
5. Connect menu settings, continue and remapping to the real game input. Change sensory subtitles to configurable hints; remove advance-timing orders from wardrobe and redundant HUD text. Keep touch interaction.
6. Add spatial audio occlusion, surface Foley and evidence playback. Improve ghost gait and low-light scene depth while preserving the reference head proportions and capture camera tests.
7. Run the full simulation and new-area geometry tests, typecheck, build, inspect the actual browser and perform targeted interaction checks. Resolve failures before source packaging and publication. Outside human playtest and measured first-time duration remain explicitly unverified.

No new dependency, engine migration, extra enemy species or map inflation. The long-form 60–90 minute target requires external playtesting; do not label this implementation with an unmeasured duration or claim sale readiness.
