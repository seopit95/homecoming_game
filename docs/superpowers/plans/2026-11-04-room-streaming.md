# Room streaming implementation plan

> **For agentic workers:** Use executing-plans to implement this plan task by task.

**Goal:** Prepare the opening and first apartment before starting; prepare subsequent rooms in the background without changing gameplay.

**Architecture:** A measured per-space texture manifest selects the existing original/compact sources. Cached worlds are built in a separate preparation scene and compiled without changing the live camera or viewport. A missing destination freezes simulation and audio, retains the current room and offers retry on failure.

**Tech Stack:** TypeScript, Three.js, React; existing Sites and HTML5 builds.

**Spec:** User authorization in the delegated 2026-11-04 request: first room and nearby route first, prefetch other rooms, safe entry, movement/audio/ending regression, comparable cold measurements, existing public deployment. No additional charges.

## Global Constraints

- Preserve source images, story, saves, audio, mobile input and ending.
- Do not add paid services, dependencies or cloud resources.
- Keep original-image fallback and full authoring preparation.
- Use the existing Sites project and audience.

### Task 1: Texture selection

Files: lib/visual-stages.json, lib/materials.ts, tests/game-visual-budget.test.mjs, app/page.tsx.

- [x] Add a failing test which prepares initial scope, verifies later-only bag/cast-concrete/facility images are absent and first-space materials equal full preparation.
- [x] Run that test; expect initial scope to request all images before implementation.
- [x] Select only manifest files in initial/area preparation; serialize overlapping scoped batches, reuse completed sources and retain transactional failure cleanup.
- [x] Re-run material equivalence, retry and orientation tests.

### Task 2: World preparation and entry gate

Files: lib/game.ts, app/page.tsx, app/game-theme.css, tests/game.test.mjs.

- [x] Test initial readiness does not build distant rooms, a pending next room freezes elapsed time and rejects input, failed preparation can retry, disposal waits for active compilation.
- [x] Construct future rooms in an isolated scene, compile their shaders, upload textures in yielded batches, and cache them.
- [x] Warm only apartment and opening road at boot. Prefetch route neighbors after start and each entry.
- [x] Before start/advance, require destination and cinematic road readiness. Keep the current room during preparation; suspend audio and simulation; expose loading/retry state and resume respecting explicit pause.
- [x] Guard threshold post-transition camera/ghost adjustments until advance succeeds.
- [x] Run scoped real-game movement, cinematic, saved-game, pause/disposal and audio regression checks.

### Task 3: Measure and release

Files: docs/quality/2026-11-04-room-streaming.md, PROJECT_MAP.md, VERIFICATION.md.

- [x] Build baseline and candidate static output separately. Compare three HTTP-cold 20Mbps trials and unrestricted trials with identical observer/server/device.
- [x] Verify first playable movement after skipping the authored intro, native browser room entry, slow/failed destination retry, pursuit audio and ending.
- [x] Document timing definition, remaining payload/GPU/CPU limits and any existing unrelated failures.
- [ ] Commit verified changes in Korean, build the final HTML5 ZIP and existing Sites archive, publish and check the public menu/start/assets/errors. Preserve itch.io login hold.
