# Grounded Escape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. The user's no-duplicate-verification instruction consolidates independent task and whole-change review into one final combined review.

**Goal:** Replace courtyard traversal padding and the immediate parking-to-road cut with coherent, frightening investigation and a physically constructed vehicle departure.

**Architecture:** Keep the existing Three/game/story/prepared-world pipeline. Execute two independent narrative units sequentially because they share game.ts; one focused parking-departure rig adds the minimum typed world/road interface. Root integrates and publishes the exact reviewed source.

**Tech Stack:** Existing TypeScript, Three.js, React/vinext, native Node test runner and Playwright/Chrome. No new dependencies.

**Spec:** docs/superpowers/specs/2026-10-16-grounded-escape-design.md

## Global Constraints

- Work only in /Users/kds_mac/PhpstormProjects/uninvited-ghost-reference, codex/reference-ghost. Reuse this linked worktree/node_modules and existing Site appgprj_6aa183a572388191bcce9a497617bc92. No manual commit/push/merge/PR; root alone uses native Sites for final publication.
- No duplicate verification: reuse V46's unchanged affected checks,91-runtime/128-input identity and one whole78-stage campaign, plus unchanged V45 capture/pause evidence. Do not run a baseline or final blanket suite, another full home-to-ending campaign, intermediate task reviewers followed by a duplicate whole-change review, or repeated hash audits. Each implementer owns red/green only for its concrete changes; after a real fix, only affected checks/views repeat. Root owns one ordinary-input annex-exit-ready→ending integration route and one final combined independent review reading supplied results without reruns.
- Preserve game input/settings APIs, manual pause, earned progress, audio controls, all unrelated story/maps/ghost anatomy, material licensing and disposal. No dependency, external gameplay asset fetch, generated raster or new generic framework. New source assets require a concrete need first.
- Actual-game evidence uses1440×900, brightness1.25,FOV72,MSAA4 and normal prepared game light/materials. Capture only new/changed presentation, retain failed candidates and exact module identities; do not recapture V46 common-area/ghost art. Source must be settled before root's one integration route; no concurrent test/browser/build/runtime edit during it.
- Native source build/save/deploy must use the exact reviewed state; preserve public access and existing URL. Archive this plan's ledger/reports before removing only its own ignored workspace. The broad game-quality goal remains active while character art, intro, first-time30–40minute pacing, subjective sound or device/cold-load requirements remain unproved.
- ABS_NODE=/Users/kds_mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node; tests use --experimental-strip-types --experimental-test-module-mocks --test. Baseline source is /Users/kds_mac/PhpstormProjects/uninvited-common-final-v46 and external V46 receipt/checks remain valid for unchanged inputs. Own preview5194 only; stop it after handoff. No helper agents.

---

### Task 1: Courtyard investigation, entry notice and sustained pursuit

**Files:** Modify lib/courtyard.ts, lib/expansion-story.ts and only courtyard/phone-device branches of lib/game.ts; tests/expansion-story.test.mjs and tests/courtyard-art.test.mjs only if their assumptions intentionally change. Create tests/courtyard-flow.test.mjs for meaningful new behavior if existing tests cannot express it. A small focused pure policy helper may be extracted only if actual game branches consume it; no test-only policy copy.

**Interfaces:** Consume existing buildCourtyard return/targets, expansionTransition/objective/journal and game carryPursuit/hunt/audio.setDevice. Preserve buildWorld APIs and all existing game settings/inputs. Produce an intentionally relocated court_gate target with matching notice/journal, carried/resumed courtyard pursuit and actual-target positional phone ringing; Task2 must preserve these branches exactly while adding its separate cinematic integration.

- [ ] Read this brief/spec, current story/court builder and relevant game callers before code. Record the exact intentional target move and baseline facts from V46 without a new full baseline run/capture set.
- [ ] Write a real regression for arrival information reachability and the known contextual/shortcut transitions, then reproduce a fail on current source. Test the policy used by the actual game for carried pursuit and checkpoint activation if extracted. No regex-only/code-shape assertion.
```js
const w=buildWorld(new T.Scene(),'courtyard');
const notice=w.targets.find(t=>t.id==='court_gate');
assert.ok(Math.hypot(notice.mesh.userData.approach.x-w.spawn.x,notice.mesh.userData.approach.z-w.spawn.z)<8);
// Downward/normal rays sample the real notice backing/posts and free approach.
// Exercise expansionTransition with read clues and known2617 shortcut unchanged.
```
- [ ] Rebuild the arrival notice on actual supported geometry, retain closed main gate architecture and update only relevant narrative/objective wording. Keep all other court target points, code2617, canonical story and prior V46 art. Remove duplicate answer-spelling prose without changing evidence meaning.
- [ ] Retain a physically delayed crawling pursuer on annex→courtyard, and a credible entry activation after first investigation for resumed court checkpoints. Implement ringing from the actual court_phone target after court_evidence until court_phone. Readable investigation text and player movement remain uninterrupted; no added pause, falling object, teleport or camera seizure. Do not globally activate archive/plant pursuit.
- [ ] Run only affected court story/notice support/route cases and one settled TypeScript/diff check. Inspect only the relocated notice and changed pursuit/phone presentation in the actual prepared game. Record free eyes, source identities, calls/errors and candidate limitations. Root owns the longer integrated play; do not duplicate it.
```text
ABS_NODE --experimental-strip-types --experimental-test-module-mocks --test tests/courtyard-flow.test.mjs tests/expansion-story.test.mjs
ABS_NODE node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```
- [ ] Self-review, stop own preview and write task-1-report.md with actual command/results, target/collider changes, current image paths and concerns. No commit/helpers/intermediate reviewer. Final combined task-compliance review pending.

### Task 2: A coherent hero car and real parking-to-road departure

**Files:** Create lib/car-departure.ts and tests/car-departure.test.mjs. Modify lib/building.ts parking branch, lib/world.ts typed optional interface/reset, lib/story.ts stage/checkpoint/objectives/journal, lib/preferences.ts save-stage support, lib/game.ts parking/cinematic/audio/preparation branches and lib/prologue.ts road handoff/cockpit integration. Modify lib/sedan.ts and/or create lib/driving-car.ts only for a genuinely shared matching hero sedan/interior. Covering tests/prologue.test.mjs, tests/story.test.mjs and tests/quality.test.mjs may be adapted only for intended new stage/physical geometry, never weakened. Do not edit Task1's settled courtyard branches or other environments.

**Interfaces:** Consume Task1's unchanged game/court behavior plus existing buildRoad/preparedWorld and actual parking props/targets. Produce world.carDeparture?:{car:T.Group;duration:number;pose(time:number,camera:T.PerspectiveCamera,reduced:boolean):number;roadFrame:T.Matrix4;reset():void}; expose the optional property explicitly across builder/world unions. Add buildRoad result setDepartureFrame(frame:T.Matrix4):void. Export carDepartureDuration=24 from story.ts and use it once as the shared sequence duration. Transition parking_run/car_board→car_departure (area parking, cinematic)→car_escape (aftermath). Preserve legacy car_escape continuation and existing passenger/fatal semantics.

- [ ] Read this task/spec and current entire car/parking/cinematic/progress/prewarm flow, not merely function names. Record the source +Z sedan/-Z road/driver-side mismatch and the instant world change with one red regression. Analyse actual bay/aisle/exit geometry before picking a physically passable route.
```js
let s={...initialStory(),stage:'parking_run'};
s=transition(s,'car_board');
assert.equal(s.stage,'car_departure');assert.equal(areaFor(s),'parking');assert.ok(isCinematic(s.stage));
// Existing source fails before any new module is imported. Keep old car_escape save tests.
```
- [ ] Construct a coherent openable hero sedan/cockpit and installed vehicle exit/ramp. Keep the nine cars, player service/clue/alarm/pump access and original arriving passage; adjust actual noninteractive car bays/markings/stops coherently if required. Correct handedness and driver/passenger windows; no intact side panel inside the opening, unsupported door, roof/pillar over the seated eye or mismatched vehicle at the road handoff. Report exact adjustments instead of changing a hidden collision mask.
- [ ] Implement a24s simulation-time departure with visible boarding/door latch/engine start, credible actual-world manoeuvre and open-shutter exit. Use real car/door bounds against real static equipment/ceiling/parked cars through finite swept path samples. Do not assert only centre-line clearance or remove the visual obstacles from inspection. Keep moving body/door colliders synchronous and the chasing ghost outside; boarding is protected success. No blackout cut conceals geometry mismatch.
```js
const w=buildWorld(new T.Scene(),'parking'),r=w.carDeparture,c=new T.PerspectiveCamera(72,16/9,.06,160);
assert.ok(r);assert.equal(r.duration,carDepartureDuration);
for(let t=0;t<=r.duration;t+=.1){r.pose(t,c,false);/* test actual car/door envelope vs actual static scene triangles/solids; retain failed sample */}
// Compare exit camera/car/visible tunnel surfaces against road.pose('car_escape',0)
// after road.setDepartureFrame(r.roadFrame), in world coordinates, not just timing.
```
- [ ] Integrate new stage, checkpoints/legacy progress, manual pause, reduced-motion and reset. Match car/camera position/heading/floor/tunnel at road handoff. Tie engine/door/wiper/audio to visible actions and reuse existing audio. Prepare newly visible cockpit/door/shutter/light states through existing warm pipeline and reset afterwards; no gameplay shader surprise or per-frame scene allocations.
- [ ] Run only affected story/prologue/departure/progress cases, TypeScript and diff. Record actual-game new departure board/latch/manoeuvre/exit/handoff views or video at normal settings, actual free/seat eyes, errors/programs/counts. If shared-car extraction changes the opening cockpit/seat/bumper, inspect that newly changed opening view/motion once and cover its actual physical impact alignment; do not rerun a full home campaign. Check one new-stage pause/replay and reduced-motion path here; root will reuse these, not repeat them. Retain rejected candidates and accurately label source identities.
```text
ABS_NODE --experimental-strip-types --experimental-test-module-mocks --test tests/car-departure.test.mjs tests/prologue.test.mjs tests/story.test.mjs
ABS_NODE --experimental-strip-types --experimental-test-module-mocks --test --test-name-pattern="progress|checkpoint|save|resume" tests/quality.test.mjs
ABS_NODE node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```
- [ ] Self-review, report exact route/target/collider/API changes, source/images/results and limitations in task-2-report.md. Stop own preview; no commit/helpers/intermediate reviewer. Report a real geometric/API obstacle early instead of a timer/fade substitute.

### Task 3: Changed-route integration, one combined review and native release

**Owner/files:** Root owns external V47 evidence/QA, docs/quality/2026-10-03-campaign-audit.md and native Sites release. No unrelated runtime patch by root.

**Interfaces:** Consume Task1/Task2 reports and exact settled world/game/road interfaces. Produce one focused ordinary-input annex_exit_ready→courtyard→archive→plant→parking→departure→fatal-ending route, a single independent review, exact native public publication and archived own ledger.

- [ ] Read worker actual reports/output/current new art. Reuse unchanged V46 evidence and workers' passing affected checks; no full suite, duplicate whole-game campaign, generic ghost/capture matrix or new intermediate reviewer. Run only genuinely uncovered changed integration, not a recitation of old cases.
- [ ] Freeze runtime/check input source once after settlement. Run one ordinary movement/aim/interact changed-region campaign from the earned annex_exit_ready checkpoint. Do not write player/enemy/stage positions after setup, pause automatically, edit runtime source/restart/build/run another browser job concurrently. Reuse worker new departure pause/reduced proof. Record actual natural portal/ghost continuity, interactions, seating/vehicle exit and car handoff/fatal ending with errors, frames/CPU/programs and input trace. Compare courtyard timing as known-route data, not first-time duration proof.
- [ ] Dispatch one most-capable fresh combined reviewer with exact diff/hashes, both briefs/reports, spec and supplied current evidence. Reviewer reads results without reruns/hash duplication. Fix concrete findings through owner, then scoped verification/rereview of only the new delta.
- [ ] Update factual audit with actual scope/results/limits; native Sites build/commit/push/archive/save/deploy the exact reviewed source to the existing public URL. Confirm native success. No new deployment approval or manual Git commit. Collect one committed-source correspondence state and retain helper warnings/errors honestly.
- [ ] Hash-archive this plan's own reports/ledger, stop only owned previews, remove only its ignored scratch, retain project/evidence and broad goal active. Do not mark senior/commercial/first-time30–40min complete from this bounded pass.
