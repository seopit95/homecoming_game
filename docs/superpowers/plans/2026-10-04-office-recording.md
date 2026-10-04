# Office recording implementation plan

**Goal:** Show the incomplete 03:26 parking recording in the management office, so the later archive restoration reveals an actual visible omission.

**Architecture:** Reuse the archive surveillance renderer and sedan. Add a bounded office playback stage with a simulation-time duration; restore movement, pause, retry, pursuit and evidence behavior through the existing game loop. Keep current desk, targets and passage geometry.

**Tech stack:** Existing Three.js, TypeScript and Node tests; no new dependencies.

**Spec:** The active whole-game quality objective and the scoped design announced in this task. Show arrival, a nine-second cut, the lone driver walking away and the unexplained second occupant. The view remains on the physical CRT; no forced camera or pause. Only the completed recording gives its journal evidence and enables the physical service_key pickup; office_key requires that pickup before office_leave. The pursuer is physically present from arrival behind the blind fire-door corner and waits during the investigation; release the door and start pursuit after the revelation. Keep contact lethal during playback too, and support the waiting crawl body on an incoming apron beyond the door sweep. This scoped change does not close the whole-game goal.

## Steps

- [x] Extend the existing office progression test to require office_playback before office_leave; add a footage regression that checks moving car, time cut, driver visibility/movement and retry rewind using real world geometry. Run these and retain the expected failures.
- [x] Add office_playback and office_finish to lib/story.ts. In lib/game.ts, play three timed subtitles, finish at 11 seconds, trigger the pursuer after playback, hide replay controls during playback and preserve normal movement/pause. Update tests/story.test.mjs and the real interaction route in tests/game.test.mjs to exercise the timed transition and pause.
- [x] Extend lib/surveillance.ts with an office recording mode, retaining archive behavior. Reuse the same garage/car and place an anatomical short-haired driver outside the closed door after the cut. Use lib/pedestrian.ts's existing joint animation with a driver appearance. Fit the screen to lib/building.ts's supported CRT, update it from simulation time, rewind on reset and reuse existing loading/disposal ownership.
- [x] Inspect actual renderer footage at arrival/cut/exit/count and at desk approach distances. Check character support, window placement, render-target restoration/disposal and no new per-frame shader stalls. Run one actual browser interaction/pause/escape reproduction, clearly distinguishing checkpoint placement from full traversal evidence.
- [x] Request one independent read-only review, resolve meaningful findings, run affected/full tests and TypeScript/diff checks, append measured evidence to the campaign ledger, then build/save/deploy the matching source through the existing public Site. Retain its receipt outside the checkout. Completed in published v37; receipt is in external quality-2026-10-04/office-v37/deployment.json.
