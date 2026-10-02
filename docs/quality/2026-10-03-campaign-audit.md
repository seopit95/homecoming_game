# Campaign quality audit · 2026-10-03

The requested outcome is a coherent, polished first-to-last playthrough: believable story and spaces, grounded props, no body/wall penetration, natural transitions, readable interactions, reliable checkpoints, stable rendering and convincing horror animation/audio. A green unit suite alone cannot establish that outcome.

Baseline: `19eb8c7`, public version 27. The previous status-only turn established hosting availability; it did not improve the campaign. This pass resumes the reproducible findings below.

## Verified defects and implementation sequence

- [x] Moving doors retain their real rotated collision shape throughout opening. Cover home, landing, corridor, stairs, resident, office, expansion exits and shared fire doors. Update `world.ts`, `navigation.ts`, `passage.ts` and the room builders; add actual-world door regression tests. Door sweeps must stop before hitting either actor and resume once clear.
- [x] Death placement preserves the available room. The corridor reproduction puts the player at `(2.4,1.65,8)` and ghost at `(3,0,8)`; the current attack jumps its root to `(3.43,0,8)` inside the wall. Test this through the real game loop, then constrain actor and falling-camera placement.
- [ ] Pursuit clearance covers the rendered body and its rotation, not only a radius of .18. In the current real corridor route, 379/638 poses penetrate solids. A .38 radius alone still leaves 309 poses penetrating. Constrain arm/leg/dress poses at narrow spaces, update navigation and steering, then measure actual visible vertices along complete routes and view the animation in browser.
- [x] Reconcile CCTV, guard call and archive into one timeline. Remove the abandoned drainage-key promise and misleading archive directions. Allow the courtyard safe to accept the correct code without unrelated collection gating. Preserve the fatal car ending and meaningful investigation.
- [ ] Inspect every stage and retry from beginning to ending using real input. Existing pure-state replay reached the ending from 99 saves and 70 retries; physical routes, survival fairness and first-time guidance remain unproven.
- [ ] Capture and inspect all spaces, props, ghost angles and cinematics at playable camera distances. Improve material response, geometry/proportions, placement/support, light/shadow coherence and storytelling visuals where current renders reveal shortcomings. Do not equate darker lighting with better graphics.
- [ ] Measure loading, traversal and every chapter crossing in browser. Eliminate perceptible stalls and verify no console/runtime errors, broken controls or inaccessible prompts. Inspect sound timing and mix in playback.
- [ ] Run the affected tests, type check and production build, inspect changed scenes, publish the verified source through the existing Site, then review the completion evidence against the full scope above.

## Evidence policy

Record fresh commands/results and rendered artifacts as each item is implemented. Source inspection is evidence for a code defect, not visual quality. Teleported interaction tests establish state transitions, not uninterrupted playability. A local fix remains incomplete until integrated with the real campaign. The overall goal remains active while any of the above is unverified.

## Implemented and measured in this pass

- All ten rotating story doors keep oriented collision while opening. The leaf pauses before sweeping through either actor. Reset now explicitly clears a runtime `yaw` before restoring the original collision: the new immediate-after-reset assertions failed in ten areas before that fix, then all 13 door tests passed. This covers the actual leaf, empty rotated bounding-box corners, line of sight and flashlight origin.
- Capture roots and the falling camera are constrained inside the available room. Both corridor-wall contact regressions pass. Full-body attack silhouettes at every capture orientation remain a separate visual gate.
- The pursuer uses a 0.43 m body radius with side/front/back-aware limb IK, continuous gown geometry and stride-aware movement. The compressed sampled envelope reaches 0.4157 m. Nineteen real-mesh pose regressions pass. The earlier seven-area audit had 0 overlaps in 4,161 sampled frames; its archive path was empty and was not counted as success.
- The archive investigation found a real navigation defect: a passable gap beside the reception desk falls between the 0.5 m grid lines. A bounded 0.25 m retry now resolves it without reducing the actor radius. Every evidence approach is reachable in the new regression. The follow-up actual-mesh archive route has 0 overlaps in 1,995 sampled moving poses; the four route searches measured 5–10 ms locally. These are route samples, not a proof for every possible player trajectory.
- Story text now consistently distinguishes the 03:17 collision, 03:20 answered guard call, and 03:26 parked-car refusal. The archive restores missing context rather than contradicting the office excerpt. Courtyard code entry accepts sufficient discovered clues without an unrelated collection gate. Mandatory hold-key instructions use the current binding.
- Wall/plaster and structural concrete now have photographic color/normal/roughness maps under CC0; provenance is in `2026-10-03-materials.md`. Ten actual-renderer scene fixtures were captured and inspected with no browser console errors. The fixture stops gameplay while setting camera/stage, so this is visual evidence, not an uninterrupted playthrough.

## Browser observations and remaining gates

The title and wake-up renders were initially captured as a black 3D background during active development. The context was not lost; later instrumentation showed the world attached, visible, and rendering actual pixels. Fresh unmodified browser runs and the scene-fixture run render correctly. No speculative renderer fix was made. Preserve this observation and repeat the production/cold-load check if it recurs; hot-reload timing is a hypothesis, not an established cause.

Artifacts and reproducible QA scripts are retained outside the deployable source tree at `/Users/kds_mac/Documents/Codex/2026-09-10/new-chat/artifacts/quality-2026-10-03`. `browser-ui.json` records startup separately from total test time and samples stationary wake-up frame timing; it does not establish all-chapter traversal performance. `campaign-view-log.json` renderer counters end on the separate hands pass and therefore must not be presented as total world draw calls.

Still open: first-to-last physical input play, chapter-boundary frame-time profiling, listening to the complete sound mix, cinematic continuity, remaining props/materials and floor support. The parking cars and several furniture assemblies remain visibly simple. Frontal crawling views still obscure most of the torso behind the head/hair; side cloth flow is improved, but this alone does not satisfy the requested natural horror character quality. Repeated expansion-floor layouts and text-only CCTV also need more authored visual storytelling. The overall goal remains active.

Fresh final checks before packaging: `npm test` passed 144/144 tests (70.64 s), TypeScript `--noEmit` passed, and `git diff --check` passed. A fresh unmodified local browser reached the start button in 5.21 s and reported no page errors or failed HTTP responses; the stationary wake-up sample was 16.7 ms median / 16.7 ms p95. Local development startup and this small frame sample are not a production-device performance guarantee.
