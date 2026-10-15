# Apartment Grounds and Service Spaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reconstruct the courtyard, common service rooms and parking as physically installed, purposeful old-apartment spaces that survive actual game progression.

**Architecture:** Rebuild existing courtyard geometry in its current builder. A focused native facility-props module holds indoor furniture/equipment assemblies consumed by the current service and parking builders. Preserve the game/world interfaces and use current materials, batching, collision and disposal; root verifies and publishes the exact integrated source.

**Tech Stack:** TypeScript, Three.js, existing Vinext/Sites, Node native tests, actual Chrome/Metal renderer.

**Spec:** docs/superpowers/specs/2026-10-15-common-areas-design.md

## Global Constraints

- Work only in /Users/kds_mac/PhpstormProjects/uninvited-ghost-reference on codex/reference-ghost. Preserve the existing linked worktree, node_modules and Site identity.
- Preserve public buildWorld/buildBuilding/buildCourtyard/buildExpansion return contracts, all target IDs/points/approaches, existing stage/checkpoint/settings/audio and ghost/navigation/door-transition logic. Existing scene bounds, arrivals and exits remain connected. Environment colliders may change to match visible rebuilt objects, but every target, patrol route, physical door crossing and pursuer route must stay reachable. Do not hide a collision failure by excluding visible surfaces from QA.
- Floor and table objects must contact their actual support within1mm in the finite checked samples. Thin paper may have its real sheet/backing thickness; arbitrary hovering planes are not paper thickness. Fixtures on walls/ceilings need physical brackets, cabinets or fixings. No object should visibly clip a solid intact panel, float above its support or make a passable-looking opening collidable. Keep loose cloth and tiny debris out of actor paths unless their visible volume has an appropriate collider.
- Reuse existing Three.js, native geometry/material helpers, static batching and world disposal. Add only a focused facility-props.ts for the common indoor assemblies if needed; no general asset registry, new dependency, engine/postprocessing system or animation framework. No new external gameplay asset fetch. Existing bundled licensed maps are the starting materials; report a concrete asset need before introducing another raster. Never edit raster images using Python.
- Static geometry/materials/maps are world-owned and disposed exactly once. Share local materials/geometries and use the existing batching approach so art detail does not create one draw per screw. No new per-frame mesh/material/geometry or random changing decoration. Keep dynamic door, clue, surveillance and water identities intact.
- Use the same1440×900, brightness1.25,FOV72,MSAA4 prepared game renderer/settings/light for matched art inspection. Record calls, triangles and warmed programs. Working submission allowance is+40calls per matched whole-scene view; this is advisory, not an FPS guarantee. Explain/repair a material performance regression rather than suppressing measurements or increasing brightness to conceal the art.
- No manual commit/push/merge/PR. Native Sites owns final build/source commit/push/archive/save/public deployment. Workers run affected checks; root reuses their results and alone runs the isolated whole campaign plus any uncovered integration probe. Workers/reviewers do not spawn helpers.
- ABS_NODE=/Users/kds_mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node. Native tests use --experimental-strip-types --experimental-test-module-mocks --test. Do not install unchanged dependencies.
- User instruction: no duplicate verification. Reuse passing results for unchanged source; workers run affected checks only, reviewers read their evidence without reruns or duplicated hash audits, and root runs only uncovered integration checks plus one final exact-source campaign. No additional blanket full suite; clean V45 baseline250/250 is already verified. Recheck only after an actual relevant source change or for a specific unanswered failure. Collect one source proof per operational state.
- Consolidate task-scoped and whole-change independent review into one final combined review of both implementations. No separate intermediate reviewer followed by a duplicate whole-change read. Root reads each worker's report/current art before moving on; both task-compliance verdicts remain pending until the final independent gate. Fixes get scoped verification of their new source only.

### Task 1: Courtyard, repair enclosure, guard booths and supported accident evidence

**Files:** Modify lib/courtyard.ts; create tests/courtyard-art.test.mjs. Also modify only the court_evidence physical-location phrase in lib/expansion-story.ts as the named integration need below. External evidence only in quality-2026-10-15/common-areas-v46/courtyard-task. No other game files without a named integration need reported to root.

**Interfaces:** Consumes surface/boxUV/softBox, roundPipe/createSedan/sedanSolids, connectionPassage/setDoorAngle and existing Solid/Target. Produces the same courtyardLayout and buildCourtyard(root:T.Group) return object, target identity/points/approaches and updateStory/reset contracts. Task2 consumes no new courtyard API; Task3 consumes the resulting unchanged world interface.

- [ ] Read the task brief first, spec and relevant current courtyard/material/static-batching/navigation/placement tests. Record owned source and old target/solid facts with hashes before editing. Baseline V45 source is71cab809d1d01d80fd79c8b41611ba60035deb73. Root supplies its clean baseline check result separately; do not run another whole suite.
- [ ] Reproduce and retain a failing actual support regression for court_log/court_evidence or current loose shards. Use actual prepared transforms/geometry and downward rays to the supporting desk, not a mesh-name/contact metadata assertion. For example, get the actual target mesh from buildWorld(new T.Scene(),'courtyard'), transform its sheet vertices with matrixWorld, and require the gap to the nearest intended desk surface to be<=.001m. Exclude the measured object/ghost from support rays. Preserve existing route/clearance assertions.
```js
const world=buildWorld(new T.Scene(),'courtyard');
world.root.updateMatrixWorld(true);
const sheet=world.targets.find(t=>t.id==='court_log').mesh;
// Sample its real world-space underside against desk triangles, excluding sheet.
// The old plane is .010m above its .810m top and must fail a .001m limit.
// The corrected sheet/backing must contact that support at the same target point.
```
- [ ] Replace the giant central black slab with an actually built enclosed repair site: fitted aged sheet sections, grounded posts/feet/bracing, coherent top/edge fixings, visible purposefully supported repair stock and rubble. Preserve two perimeter routes/end crossovers and a visible/collidable boundary that agrees. If a below-grade excavation is visible, cut the overlapping yard floor and close its sides/bottom; do not fake a hole under an intact coplanar floor.
- [ ] Reconstruct facades with recessed windows/sills/frames and plausible wall-supported utility/domestic fittings at varied restrained locations. Give the playable lower wall a finished structural base and service details. Keep tower mass and human-scale yard routes coherent; repeat structural bays deliberately but avoid identical decorative placement. New geometry remains within the existing yard bounds and does not block clue/patrol/exits.
- [ ] Reconstruct both booths as recognizable guard/maintenance spaces with window/opening/frame thickness, roof/weather protection, supported furniture and a clear doorway. Preserve exactly the log/dials/phone/gate/exit targets, code updates and puzzle text. Give the accident evidence believable thin headlamp pieces and a supported notebook. Improve the bench/planter/light/playground presentation where it touches these routes; do not sprinkle generic clutter to hide empty space.
- [ ] Align the court_evidence journal's physical location with its visible supported target: replace only '놀이기구 아래에 내 차의 깨진 전조등 조각이 있다.' with '놀이터 옆 점검대 위에 내 차의 깨진 전조등 조각이 있다.' in lib/expansion-story.ts. Preserve all other text/IDs/timing/code. This corrects a discovered existing tabletop-versus-under-playground contradiction; no prose-mirroring test or duplicate suite is required. Include it in the owned diff/report and settled typecheck.
- [ ] Use shared materials and existing static batching; keep interactive/dynamic objects exempt. Run the focused command below, fresh TypeScript and git diff --check. Fix actual geometry, not covering thresholds. Inspect usable before/final actual-game views under specified light/settings from free standing/crouched eyes, record source hashes/counts/errors and preserve rejected candidates. Explicit pose fixtures are art evidence, not natural progression or timing proof.
```text
ABS_NODE --experimental-strip-types --experimental-test-module-mocks --test tests/courtyard-art.test.mjs tests/expansion-world.test.mjs tests/placement.test.mjs tests/static-geometry.test.mjs
ABS_NODE node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```
- [ ] Self-review the entire owned diff and write task-1-report.md in this plan's workspace, including red/green commands/output, current hashes, images, calls/triangles/programs, rejected candidates and limitations. Stop only the worker's owned preview after use. Return DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, one-line checks and report path. Root owns review; no commit or helpers.

### Task 2: Installed common-facility equipment, furniture and parking infrastructure

**Files:** Create lib/facility-props.ts and tests/facility-props.test.mjs; modify lib/expansion-world.ts and lib/building.ts (office/parking environment and their local physical props only). Existing tests/expansion-world.test.mjs, tests/placement.test.mjs, tests/sign-support.test.mjs and tests/storage.test.mjs are covering consumers; change tests only for genuine behavior assumptions with explicit justification, never to relax contact/reachability.

**Interfaces:** Consumes existing surface/boxUV/softBox, roundPipe, storageShelf, buildWorld and Solid/Target. Produces native Group/Mesh furniture/equipment assemblies in facility-props.ts for its two caller files, without a registry or new runtime state. Preserve the current buildExpansion/buildBuilding return objects, target IDs/points/approaches, water/surveillance/control/door identities and updateStory/reset behavior. Task3 continues through buildWorld unchanged.

- [ ] Read this task brief first, spec and relevant existing builder/furniture/storage/placement contracts. Record owned source/hash and before-render facts. Task1's courtyard output is settled and must remain untouched; final independent combined review remains pending. Read only the integration facts root supplies, not Task1's whole history.
- [ ] Reproduce the unsupported6mm evidence papers and10mm suspended garment/rail gap, or another actual current installation fault, before fixing. Add a meaningful geometry/ray regression sampling the actual sheet/support or garment/hanger/rail contact; no mesh-count-only test. Include actual support/reachability of the revised equipment, rather than mirroring new constant coordinates.
```js
for(const area of ['annex','archive','plant','parking']){
 const world=buildWorld(new T.Scene(),area);
 // Ray/triangle support contacts, real clear target approach and installed volume.
 // Existing papers at y=.826 with worktop y=.820 must fail before correction.
 // Dispose the real world after each finite checked sample.
}
```
- [ ] Build connected, human-scale worktables/chairs/cabinets and papers with appropriate top thickness, legs/stretchers and material variation. Replace unsupported paper planes with supported thin sheets/backings while preserving their readable wording and interaction points. Install common-facility mailboxes, lockers, laundry machines and hanging clothes with recognizable depth, controls, hinges/vents and connected hoses/pegs/rails. Give the staff space an intentional lived-in arrangement; preserve Han Seo-yeon/badge/single-shoe/returned-notice meaning.
- [ ] Give archive storage/editing a purposeful arrangement with supported recordings/stationery and installed equipment/cables. Keep the existing surveillance/replay and text timings intact. Rebuild plant tanks, pump/motor units, pipe junctions, supports and circuit housings as connected service equipment, using dished/curved casing where appropriate. Preserve valve/control movement, visible water/drain behavior and all clues. Replace shared out-of-context boilerplate decoration with room-appropriate fixtures. Equipment must sit on actual supports and stay clear of the walking/pursuer routes.
- [ ] Improve the old parking service environment: connected pipe supports/drainage, credible column base/protection, installed light/electrical/fire fittings and visibly grounded parking stops/service props. Preserve vehicles, own-car targets, alarm, pump legacy-save branch, arrivals and finale. Do not change other building areas, ghost, navigation or door-transition logic to make these props fit.
- [ ] Batch the native assemblies with existing helpers and reuse local materials. Run focused tests, TypeScript and diff-check; inspect matched prepared actual-game views for each room function and parking, including standing/crouched near support/installation. Keep authored props readable without increasing game brightness. Record exact source/current images, renderer counts and errors; retain failed candidates.
```text
ABS_NODE --experimental-strip-types --experimental-test-module-mocks --test tests/facility-props.test.mjs tests/expansion-world.test.mjs tests/placement.test.mjs tests/sign-support.test.mjs tests/storage.test.mjs tests/surveillance.test.mjs tests/transitions.test.mjs
ABS_NODE node_modules/typescript/bin/tsc --noEmit --incremental false
git diff --check
```
- [ ] Self-review and write task-2-report.md with red/green, hashes, current views/counts, concerns and any exact target/collider change. Stop only the worker's preview. Return the short status contract; no commit or helpers. Root includes both tasks in the single final independent review.

### Task 3: Exact-source art, physical support, pursuit, progression and authorised publication

**Owner:** root integration; only a reviewed defect justifies another implementation dispatch.

**Files:** docs/quality/2026-10-03-campaign-audit.md for factual record, external common-areas-v46 evidence and native Sites receipts. No unrelated code patch by root.

**Interfaces:** Consumes both reviewed builders via unchanged buildWorld/game inputs. Produces exact-source independent whole-change review, successful native Site version and archived task evidence.

- [ ] Verify every task finding is addressed or transparently ledgered under SDD. Freeze all app/lib/public files by dynamic enumeration in an immutable QA checkout; retain current check-input hashes. Reuse workers' settled affected checks and latest TypeScript/diff evidence when their inputs are unchanged. Run only genuinely uncovered affected integration checks; do not rerun the blanket250 suite or previously passed task checks. A relevant source fix justifies only its covering recheck.
- [ ] Independently inspect both current art sets and matched old/final actual-renderer views. Reject insufficient visual improvement, floating evidence, unrealistic fixtures or a new body/wall overlap even if tests pass. Record free eye positions, identical settings, real materials/lights, counts and limits. Support samples and viewport snapshots cannot certify every prop or pose.
- [ ] Reuse the V45 natural reduced-motion/manual-pause/capture evidence while its game/ghost/resident/settings inputs stay unchanged; do not rerun it. Check only genuinely new pursuer-versus-rebuilt-prop clearance inputs not covered by task checks, using finite actual-world poses/geometry. Run one isolated known-route full fatal-ending campaign from the immutable final source. Retain all stage/door transitions, targets, errors, failed requests, raw RAF/CPU/program counts and exact source correspondence. No runtime edit, restart, build or competing test/browser job during that campaign. Investigate a reproducible regression before publication; do not erase the V45 wardrobe interval or substitute old route proof for changed areas.
- [ ] Dispatch one fresh final whole-change reviewer on the most capable model with exact working diff/hash list, spec, ledger and current evidence. Fix combined actionable findings through the original worker or one combined final fix wave, followed by scoped rereview. Report every ruling and its cost if wrong.
- [ ] Update the factual audit with actual scope/results/limits. Use native Sites build/source commit/push/package with a fresh credential and the current opening identity. Compare reviewed/runtime/check input hashes to the resulting commit and verify expected archive files before save. Save and deploy to the existing public Site; require native success before claiming availability. No new conversational confirmation is needed for this already authorised public update.
- [ ] Hash-archive this plan's reports/ledger/diffs externally before removing only its own ignored scratch directory. Preserve permanent docs and sibling workspaces. Stop owned QA servers, preserve user processes. Keep the broad goal active while any whole-game requirement remains unproved.
