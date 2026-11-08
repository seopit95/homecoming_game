# Ghost Close-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Improve the actual capture mouth and wet-hair silhouette while preserving the character's collision-safe gait, identity and timing.

**Architecture:** Keep the current Three.js rig and continuous facial mesh. Sculpt and shade the recessed oral surface, bind a tongue to the existing jaw and refine the existing hair mesh/alpha mask rather than adding a character loader or animation dependency.

**Tech Stack:** TypeScript, Three.js, Node native tests, Chrome/Playwright, existing Sites publishing workflow.

**Spec:** `docs/quality/2026-10-03-campaign-audit.md`, v42 findings: mouth reads as a flat black cavity; hair cards retain angular silhouettes. The original whole-game quality objective remains active beyond this pass.

## Global Constraints

- Use the existing Site checkout and `project_id`; preserve public access and checkpoint formats.
- Preserve walking/crawling navigation, capture contact, camera fall, manual pause and reduced-motion support.
- Keep tissue behind the lips and teeth; restore the resting face without exposed oral props.
- Avoid degenerate mouth-center triangles, floating tongue geometry and new hair floor/wall intersections.
- Add no dependencies; retain deterministic simulation-time posing and explicit resource disposal.
- Compare the actual renderer, not only geometric metrics. Do not claim photorealism or whole-game completion from bounded checks.
- Publish only the verified final source using the Sites build/push/save/deploy workflow; no manual intermediate Git commits.

---

### Task 1: Recessed mouth anatomy

**Files:** `lib/ghost-face.ts`, `tests/ghost-surfaces.test.mjs`.

**Interfaces:** Retain `createFace(head, skin)`, `poseFace(rig, open)` and all existing facial mesh/group names. Add a tongue mesh to the returned rig; existing callers need no changes.

- [x] Add a regression for nonzero-area indexed oral triangles through partial/full opening. Compute each triangle's cross-product magnitude rather than asserting a fixed index count.
- [x] Run against v42 and save both results outside the repository. The missing oral-floor regression must fail. The original triangle-area guard passed: do not describe the previous cavity as a reproduced degenerate-triangle defect.
- [x] End the cavity with a non-collapsed ring and one center vertex. Extend the existing grid helper with an optional center fan; the facial and gum grids stay unchanged.

```ts
const shrink=Math.cos(t*Math.PI*.43);
// Last ring keeps a radius; only the single added center closes the cavity.
if(cap){const center=positions.length/3-1,start=rows*(cols+1);
  for(let i=0;i<cols;i++)ids.push(start+i,start+i+1,center);}
```

- [x] Give the oral surface a depth gradient and subtle actual folds using native physical material/vertex colors. Keep the innermost throat dark; inspect whether the outer tissue catches the existing flashlight.
- [x] Shape the existing enamel spheres into rounded crowns without changing their arches. Add a small sculpted tongue to the existing jaw, behind the lower crowns; hide it at rest.
- [x] Verify tongue motion follows jaw displacement and exterior oral rays are blocked by the cheeks when outside the lip. Run all focused ghost regressions, including existing tooth occlusion and partially opened rows.

### Task 2: Wet hair flow

**Files:** `lib/ghost-hair.ts`; existing hair/collision tests.

**Interfaces:** Keep `createHair(head)` and `settleHair(tails, figure, time, floor, heightAt?)` and the same mesh ownership/disposal path.

- [x] Preserve the fixed v42 source in the external QA copy for matched rendering.
- [x] Refine curve sampling and blend the skull-to-hanging transition; round each existing ribbon cross-section slightly. Preserve scalp anchoring and floor settling.
- [x] Replace the equally spaced mask with deterministic wet strands of varied width/end length. Use native alpha-to-coverage for antialiased silhouettes; add no shader framework.
- [x] Run existing scalp, anchored-hair, cloth, wall, capture and stair-floor regressions. Compare front/quarter/profile walking, crawl and open-mouth frames, including a clear exposed eye.

### Task 3: Actual game verification and publication

**Files:** `docs/quality/2026-10-03-campaign-audit.md`; if required by final capture findings, `lib/ghost.ts`, `lib/ghost-dress.ts`, `tests/ghost-surfaces.test.mjs`, `tests/ghost-capture-gown.test.mjs`; external evidence under `artifacts/quality-2026-10-05/closeup-v43`.

- [x] Use the matched viewer with identical camera/light/material preparation on frozen v42 and the candidate. Save rejected candidates instead of treating numeric passes as visual approval.
- [x] Request independent scoped geometry/resource/visual review through the existing review agent under requesting-code-review. Implement findings and rerun affected checks.
- [x] Resolve the reproduced crouched-capture torso/cloth crossing through the lower mouth. Use the actual resident geometry/contact/camera fixture and a meaningful expected-red regression. Preserve contact/camera timings and keep the body visible; do not hide the overlap with material sidedness or invisibility. Verify standing/crouch/reduced-motion and restored resting poses.
- [x] Run a frozen actual-game capture and ordinary chase segment; record renderer errors, raw RAF/frame CPU timing and the exact source hashes. Preserve manual-pause/reduced-motion behavior.
- [x] Run the full native suite, TypeScript `--noEmit --incremental false`, and `git diff --check`. Save concrete limitations in the audit.
- [ ] Build/push via `site-workflow.mjs`, save the exact commit/archive and deploy the returned version. Confirm the native deployment succeeds and preserve its receipt. Leave the broader art/room/pacing/audio/device goal active.
