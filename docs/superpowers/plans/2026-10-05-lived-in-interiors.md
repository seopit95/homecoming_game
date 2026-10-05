# Lived-in Interiors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sparse box-like domestic rooms with constructed furniture, photographic wood surfaces and physically supported story dressing.

**Architecture:** Keep the existing world, collision and interaction contracts. Extend native surface loading and existing prop constructors, then compose distinct lived-in rooms with the established story. Validate real geometry and actual game lighting before native Sites publication.

**Tech Stack:** TypeScript, Three.js, existing static geometry batching, Node native tests, Chrome/Playwright, native Sites.

**Spec:** `docs/superpowers/specs/2026-10-05-lived-in-interiors-design.md`.

## Global Constraints

- Reuse Site project `appgprj_6aa183a572388191bcce9a497617bc92`, existing isolated checkout and public audience; base `07091646a017ac7fb8d2243b4c2306083b2862a8`.
- No new dependencies, character/story-stage/checkpoint schema changes, extra fetch objectives or manual intermediate Git commits. Source commits/push/save/deploy are owned by the Sites workflow.
- Preserve existing interactive target identities, contact/capture/pause/reduced-motion behavior and connected exits; change solids only to match measured physical furnishings.
- Keep home table support heights 0.535/0.80/0.68 m and resident table/desk/device support heights 0.45/0.81/0.70 m.
- Use only bundled original 1K photographic maps, verify upstream MD5/local SHA/size, retain world-owned disposable texture clones and exact material interfaces.
- Keep Han Seo-yeon, `내선 17`, single shoe/envelope, missed call, fridge appointment and annex badge consistent; no new family/brand/real address/dated chronology.
- No floating, wall-piercing, coplanar or unsupported room props; tabletop/hanging decoration stays within its support envelope, obstructive floor props have matching solids.
- Judge actual normal-game-light wide/close renders at standing/crouch heights, not only tests/counts. Record the working +20 draw-call budget, tradeoffs and unresolved art honestly.
- Preserve every rejected candidate/evidence externally. Final full suite/typecheck/diff, frozen route and native receipt must correspond to the published runtime including new files. Broader goal remains active.

---

### Task 1: Photographic furniture and floor material

**Files:** Modify `lib/materials.ts`, `public/textures/pbr/sources.json`, `docs/quality/2026-10-03-materials.md`; create six `wood-{color,normal,arm}.jpg` / `wood-floor-{color,normal,arm}.jpg` assets and `tests/wood-materials.test.mjs`.

**Interfaces:** Retain `prepareVisuals():Promise<void>`, `surface(kind:Surface,color?:string,options?:MeshStandardMaterialParameters)` and `boxUV(...)`. Tasks 2/3 consume `surface('wood')` / `surface('woodFloor')` without knowing texture source internals.

- [ ] Write and run a covering red with a controlled `TextureLoader.loadAsync` returning real `T.Texture` instances. The wood/floor surface must have distinct color/normal/ARM clones, only color sRGB, shallow normal mapping, physical repeat and no atlas bump callback on the physical path:

```js
await prepareVisuals();
const m=surface('wood'),n=surface('wood');
assert.ok(m.normalMap && m.roughnessMap && m.aoMap);
assert.equal(m.map.colorSpace,T.SRGBColorSpace);
assert.equal(m.normalMap.colorSpace,T.NoColorSpace);
assert.notEqual(m.map,n.map);
assert.notEqual(m.normalMap,n.normalMap);
assert.equal(m.bumpMap,null);
```

- [ ] Download `Diffuse`/`nor_gl`/`arm` original 1K JPG channels from `api.polyhaven.com/files/dark_wood` and `/files/old_wooden_floor_02`; verify each URL's MD5 and byte count before saving. Record license, authors, 2 m/2.03 m scale, URLs, hashes and 3,562,562-byte payload in the existing manifest/docs without altering old records.
- [ ] Extend `physicalSources` keys and loading with `wood`/`wood-floor`. In `surface`, select those for wood/floor, use existing cloned color/normal/ARM ownership, `repeat = 1.8 / physicalWidthMeters`, linear normal/ARM, shallow normal scale and authored options. Do not apply the old board-joint shader to physical floor:

```ts
const physical=kind==='wood'?'wood':kind==='woodFloor'?'wood-floor':
  kind==='wall'||kind==='decayWall'?'plaster':kind==='garage'||kind==='concrete'?'concrete':undefined;
// Keep the existing physical-material early return and disposable map clones.
```

- [ ] Run `tests/wood-materials.test.mjs`, relevant material/loading/ownership tests and fresh TypeScript/diff. Inspect native prepared wood/floor renderer images; append exact logs/paths/hashes/payload and failure/success scope to the task report. No full suite, commit or publish in worker.

### Task 2: Constructed domestic furniture

**Files:** Modify `lib/props.ts`, `lib/world.ts`, the resident portion of `lib/chapters.ts`, and only apartment sofa/bed pillow blocks in `lib/japan.ts`; create `tests/domestic-furniture.test.mjs`.

**Interfaces:** Produce native assemblies `sofa(width,depth,wood,fabric):T.Group`, `drawerUnit(width,height,depth,wood):T.Group`, `writingTable(width,topY,depth,wood):T.Group`, `bed(width,depth,mattressTop,wood,linen,blanket):T.Group`, `bookcase(width,height,depth,wood):T.Group`. Consume existing `surface`, `softBox`, `boxUV`, `batchStaticGeometry`, and `spaceFurniture`. Task 3 will place decoration on the named, measured room assemblies; name installed roots `home-sofa`, `home-phone-table`, `home-tv-cabinet`, `home-study-desk`, `home-bookcase`, `home-bed`, `home-nightstand`, `resident-low-table`, `resident-device-cabinet`, `resident-study-desk`, `resident-bookcase`, `resident-bed`, `resident-entry-cabinet`.

- [ ] Add permanent tests that fail on the original deficient assemblies: actual floor-to-top supports and exterior panels, human sofa seat height, pillows/blanket support, book covers/page blocks with believable thickness, target/prop support rays after `buildWorld` batching. Guard exact existing table heights and reachable phone/radio/torch/resident clues. Save baseline output honestly.

```js
const w=buildWorld(new T.Scene(),'resident');
w.root.updateMatrixWorld(true);
const support=new T.Raycaster(new T.Vector3(-3.8,.702,3.6),new T.Vector3(0,-1,0),0,.02)
  .intersectObject(w.root.getObjectByName('resident-device-cabinet'),true)[0];
assert.ok(support,'the answering-machine base must meet a physical cabinet top');
```

- [ ] Build the five prop constructors with supported legs/base, carcass/reveals, rounded sofa cushions, real mattress/blanket and varied thin books. Use local offsets and native primitives; reuse the existing batching on anonymous static children where it reduces submissions without losing interactive identity. Avoid adding a furniture registry, loader or generic layout engine.
- [ ] Replace the corresponding anonymous boxes in home/resident with the new assemblies at the original anchors/orientations. Keep target objects separate and supporting heights exact. Sofa uses a 0.48–0.52 m seat. Relocate its old decorative pillows onto the cushion; remove duplicate bed pillow stacks and use the factory's supported pillows/cloth. Update only measured physical solids.
  Preserve measured study-leg floor/top support probes: home local leg centers x ±0.88, z ±0.26 around the desk anchor; resident local leg centers x ±0.82, z ±0.22. These legs remain connected to the specified table underside and floor after `spaceFurniture` and batching.
- [ ] Run new furniture, placement, world reachability/navigation, doors/static batching and affected ghost-clearance tests; TypeScript/diff. Render wide/near examples in the actual prepared room light, including bookcase, sofa, bed and device surfaces. Supply a settled owned diff, exact command outputs, dimensions/support rays, resource/draw delta and any remaining art limits; no full suite, commit or publish in worker.

### Task 3: Supported living traces and coherent building signs

**Files:** Create `lib/room-dressing.ts` and `tests/room-dressing.test.mjs`; modify `lib/world.ts`, resident `lib/chapters.ts` and `lib/japan.ts` signage/dressing sections. Correct the existing sign-text calls in `lib/building.ts` for consistent 1994/Korean/destination wording; no building geometry/targets/routes change. Do not change the approved constructors/material layer.

**Interfaces:** Consume Task 2 named furniture roots and measured support tops. Produce `dressLivingSpace(root:T.Group,solids:Solid[],area:'apartment'|'resident'):void`, called after existing furniture/dressing and before final world batching. Existing `Target[]` and `updateStory` signatures remain intact.

- [ ] Add geometry/placement red checks for new physical living traces: drink vessels/table support, hanging/folded clothing support, a pot/plant base, actual fixture-wall contact, no nearby solid intrusion and unmasked entry/phone/radio/clue targets. Capture actual notice strings through the canvas context and fail on Japanese building notices/tenant names while checking Han Seo-yeon/2803/1704 safety consistency.
- [ ] Compose the protagonist's neglected late-night living area with unbranded drink vessels and grounded keys/jacket; compose the victim's prepared but interrupted home with a spare work shirt, cared-for plant and an appointment reminder near the existing tea/answering machine. Use native curved geometry and real supports, not flat colored boards. Preserve the unique annex work badge and existing clue text. Align placements to measured Task 2 furniture surfaces:

  The exported signature is `dressLivingSpace(root:T.Group,solids:Solid[],area:'apartment'|'resident'):void`. Its implementation authors the specified native physical props on the measured support surfaces and adds a matching `Solid` for any obstructive floor prop.

- [ ] Replace Japanese physical notices/tenant names with Korean text and a Korean-capable font. Use fictional `1994년 준공`; check direction from each actual sign plane toward its real destination, using explicit destination text when a planar arrow would mislead. Keep existing sign backing/supports and horror visual style. Use concise Korean lines that fit their existing canvas/sign dimensions; inspect real-renderer text for clipping or illegible shrinkage.
- [ ] Run room-dressing/placement/sign-support/world/navigation/story checks and fresh TypeScript/diff. Inspect all requested wide/close actual-light views and new story context. Report exact physical-support/render/source evidence and limitations. No full suite, commit or publish in worker.

### Task 4: Final integration, full route and publication

**Files:** `docs/quality/2026-10-03-campaign-audit.md`; exact-source QA/review/build/deployment evidence externally under `artifacts/quality-2026-10-05/interiors-v44`.

- [ ] Preserve immutable V43 source and matched baseline before worker edits. Review each task through SDD; resolve real findings with covering reruns and scoped re-review. Carry measured performance/art findings into one whole-branch review.
- [ ] Freeze final `app/lib/public` sources including new files and verify their SHA-256 against primary. Render the eight requested interior viewpoints wide/close at normal/crouched camera heights; record default runtime materials, support checks, visible target text, submissions/triangles, errors and load behavior. Reject low-quality new forms even when tests pass.
- [ ] Run the full native suite, `tsc --noEmit --incremental false`, `git diff --check`, actual interaction/escape, pause/reduced-motion capture and one final ordinary known-route campaign without editing/restarting frozen sources. Save raw RAF/CPU/program/area-boundary records and distinguish first-time pacing/device limits.
- [ ] After clean final review, use native `site-workflow.mjs` build/push/package, save exact commit/archive and deploy returned version on the same public Site. Preserve separate local archive and native archive identifiers, source identity proof and successful native URL receipt. Archive this plan's scratch reports/ledger, clean only owned QA previews/workspace, and leave the broad quality goal active.
