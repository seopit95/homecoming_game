# Anatomical Ghost Head Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace the ghost's flat facial profile and mismatched cap with anatomically based skin, eyes, a continuous frightening gape and fitted wet hair.

**Architecture:** Reuse existing CC0 adult-female anatomy, the existing face/hair rig and owned materials. Author a complete head with a skin-attached mouth border, then fit scalp and gravity-following locks to it. Keep gameplay interfaces and all encounter/collision behavior unchanged.

**Tech Stack:** TypeScript, Three.js, Node native test runner, Playwright/Chrome Metal, existing Vinext/Sites deployment.

**Spec:** docs/superpowers/specs/2026-10-05-anatomical-ghost-head-design.md

## Global Constraints

- Work only in /Users/kds_mac/PhpstormProjects/uninvited-ghost-reference on codex/reference-ghost; preserve existing checkout, shared node_modules and public Site identity.
- Preserve createGhost/animateGhost/animateGhostAttack/animateGhostPassenger/animateGhostEmergence signatures, existing stage logic, pursuit/navigation, head-group animation contract and user settings. Do not enlarge the head group to manufacture a scare.
- Preserve existing wall/floor/door clearance and body/limb/clothing continuity behavior. Local head/hair fit adjustments are allowed; route, speed, door geometry, wardrobe and story changes are not part of this pass.
- Reuse existing CC0 anatomy and existing built-in generated textures; any derived mesh records its source hashes, transform, license and construction. Do not edit raster images with Python or add an unlicensed texture. If a new raster is truly required, report the need before changing the approach.
- Dynamic geometry, maps and materials remain world-owned and disposable. Ordinary animation must not allocate new meshes/geometries/materials per frame; temporary authoring data stays outside runtime.
- Keep final character draw calls no more than 20 above baseline at identical views/settings. Record triangles and warmed programs; this is an advisory submission budget, not an FPS claim. Source and browser checks must identify the exact candidate.
- No manual commit/push/merge/PR: the authorised native Sites workflow owns the final source commit. Record exact snapshots/diffs for review of uncommitted work.
- Workers/reviewers must not dispatch subagents. Worker uses focused tests while iterating; root alone runs the final full suite on settled source.
- ABS_NODE is /Users/kds_mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node. Use --experimental-strip-types --experimental-test-module-mocks --test for native tests. System Node is too old.

### Task 1: Complete anatomical head, connected scare morph and fitted wet hair

**Files:**
- Modify: lib/ghost-face.ts, lib/ghost-hair.ts, lib/ghost.ts (head/neck fit only), lib/materials.ts (face material integration only if needed), docs/assets.md.
- Create if the authored topology needs a derived asset: lib/assets/ghost-head.json and scripts/author-ghost-head.mjs (or .py), with pinned source/transform metadata.
- Test: tests/ghost-surfaces.test.mjs, tests/ghost-hair-flow.test.mjs, tests/ghost-capture-gown.test.mjs, tests/ghost.test.mjs; add tests/ghost-head.test.mjs for actual anatomical/morph behavior.

**Interfaces:**
- Consumes: createFace(head:T.Group,skin:T.Material), poseFace(r:FaceRig,open:number), faceDepth(x:number,y:number), createHair(head:T.Group), settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number), existing faceMaterial/surface preparation.
- Produces: same signatures/FaceRig gameplay usage. If actual lip-border/landmark indices are exposed, store them on the existing FaceRig or face.userData for tests and hair fit; no test-only runtime class or general asset registry.

- [ ] Read this task brief first, then the spec and only the relevant existing face/hair/rig/material/test contracts. Read docs/pedestrian-head-credits.md. Existing pinned source and extract script live at /Users/kds_mac/Documents/Codex/2026-09-10/new-chat/artifacts/realism-2026-09-23; bundled pedestrian-head.json is already a full anatomical head. Use either bundled or original topology as the actual starting mesh, not another depth sheet. Source helpers belong to external authoring, no new game dependency.
- [ ] Record exact pre-edit copies/hash of all owned files and a baseline actual-renderer set in /Users/kds_mac/Documents/Codex/2026-09-10/new-chat/artifacts/quality-2026-10-05/anatomical-head-v45/task1. Baseline rest/gape front, three-quarter/profile and passenger must visibly establish the reported defect. Use existing createGhost/material preparation and game lighting for integration; no renderer substitute as sole visual evidence.
- [ ] Add the smallest failing actual-anatomy/profile test before replacing the representation. The changed head must have real eyelid recesses, separate seated eyes, ears/jaw/skull continuity, and nose-to-cheek depth. Test through the real createGhost geometry/rays, not a metadata or mesh-count assertion. Record the expected-red command/output. Add a continuous morph/rest regression and adapt existing lip-border grid assumptions only to the actual new border, preserving ray/cavity/limb coverage.
```js
const figure=createGhost(new T.Group());
const head=figure.getObjectByName('ghost-head');
const face=figure.getObjectByName('ghost-continuous-face');
// Use rays against the actual face/eye meshes at anatomical landmarks.
// A front portrait cannot stand in for recessed lids, a nose and a closed side skull.
// The regression report records the exact rays, hit depths and old failure.
const scale=head.scale.clone();
for (const open of [0,1e-6,.12,.3,.65,1,1.025,0]) {
  poseFace(faceRig,open);
  // finite vertices, joined rim/skin, recessed tissue and no surface inversion;
  // compare adjacent tiny increments rather than simply asserting a count.
}
assert.deepEqual(head.scale.toArray(),scale.toArray());
```
- [ ] Author the minimal complete skin/eye surface and deterministic rest→gape deformation. Preserve forehead/skull, nose/cheek/jaw depth, visibly connected oral tissue/gums/teeth/tongue and accident asymmetry/staining. Keep original geometry at rest as a reusable base, preallocate position/morph buffers and update in place. Align facial albedo landmarks, keep the rear head/neck coherent, do not paint a second set of eyes behind real eyes. A derived asset must include actual source hashes and construction metadata; no downloaded body or temporary candidates shipped.
- [ ] Fit cap and hanging locks using that same complete head. Keep roots/scalp contact, one exposed uncanny eye, no skin penetration or visibly rigid bands at forehead/temple/chin, ground-supported tips and continuous movement under head tilt/gape/crawl/passenger. Fix anatomical neck attachment using local fit, without changing pursuit/body/door logic. If faceDepth's old domain becomes incompatible, update both its producer and hair consumer explicitly and retain one focused test for their shared surface relationship.
- [ ] Run focused affected ghost tests, TypeScript and diff-check; record commands/output and candid inherited warnings. Inspect matched baseline/final rest/gape front/three-quarter/profile, walking/crawling, standing/crouching/reduced capture and passenger views under usable actual-game light. Keep failed candidates. Record source hashes, calls/triangles/programs and physics/morph checks. Do not claim commercial-quality success from a gray geometry view.
- [ ] Self-review the complete owned diff, make any covering fixes, and write the report to this plan workspace task-1-report.md. Include source/asset provenance, exact test evidence, render paths, rejected candidates and limitations. Return only DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, no commit, one-line checks, report path and concise concerns. A fresh task reviewer is root-owned.

### Task 2: Exact-source encounter, fatal ending, final review and authorised publication

**Owner:** root integration; no additional implementation worker unless a reviewed defect requires a fix.
**Files:** docs/quality/2026-10-03-campaign-audit.md only for factual record; external anatomical-head-v45 evidence; native Sites commit/archive/receipts.
**Interfaces:** consumes Task1's stable createGhost/animation/material contracts and source hashes; produces reviewed, tested, exact-source native Site version.

- [ ] Resolve every Task1 review issue under SDD rules. Freeze the final app/lib/public source in a new immutable QA copy with dynamic file enumeration and hashes. Never mutate source or run a build during a campaign.
- [ ] Run the settled full native suite, fresh TypeScript --noEmit --incremental false and git diff --check once. Keep logs/exit codes/source input hashes. Rerun only after relevant source fixes.
- [ ] Verify an actual ordinary-input natural encounter/contact with manual pause and reduced motion, with no actor position writes after saved-stage setup. Run the existing known-route campaign through the fatal car ending on frozen source; retain real encounters/transitions, errors, raw RAF/CPU timings/program counts and exact source correspondence. The thirteen-minute known route is not first-time pacing evidence.
- [ ] Independently inspect usable new head/hair views from Task1, actual capture and the passenger fatal-ending sequence. Reject a candidate if the anatomical replacement is visually broken or loses the established horror identity; do not approve an art regression because tests pass.
- [ ] Dispatch one final whole-change reviewer on the most capable model with spec/plan/ledger/diff/proof paths. One combined fix wave and one scoped re-review if needed; preserve all findings and exhaustive rulings.
- [ ] Record the exact new scope/results/limitations in the audit. Use native Sites hosting build/save/deploy with a fresh credential and previous qualityBuiltV44 source identity. Verify built/committed hashes and expected files before save; deployment must succeed before reporting public availability.
- [ ] Archive this plan's reports/ledger with hash verification, report all rulings and their cost if wrong, remove only this plan's scratch directory after gates pass. Keep goal active while broad art/pacing/audio/device gates remain.
