# High-rise Escape Implementation Plan

> Execute inline in this site-owning session; implementation and story continuation are requested by the user.

**Goal:** Extend the apartment vignette into a playable high-rise escape.
**Architecture:** Pure story transitions, procedural disposable scenes, one existing game loop and shared collision-aware navigation.
**Tech Stack:** Existing Three.js, React/vinext, WebAudio, Node tests.
**Spec:** docs/superpowers/specs/2026-09-10-highrise-design.md

## Global Constraints

Korean solo horror; no new runtime dependencies; keyboard/touch parity; pause freezes threats and scene timers; preserve private access and site ID.

## Tasks

- [x] Add full-route, guarded transitions, hiding and section-retry tests to tests/story.test.mjs. Run npm test and observe feature failures, then implement lib/story.ts.
- [x] Add reachability tests for all seven areas to tests/world.test.mjs and detour/sealed-route tests to tests/navigation.test.mjs. Observe failures before implementing scene geometry and navigation.
- [x] Extend lib/world.ts and add lib/building.ts: disposable root, bounds, spawn, targets, stair height, animated lift doors and display.
- [x] Extend lib/game.ts and lib/audio.ts: scene swaps, checkpoint retries, lift descent, hold-to-pry, timed patrol/lure, stair loop and chapter cues.
- [x] Update app/page.tsx, app/globals.css and metadata: floor/chapter HUD, sprint, hold progress, pauseable notebook and final story.
- [x] Run npm test, npx tsc --noEmit, npm run lint and npm run build. Review full route and cleanup. 
- [ ] Commit/push exact source, package/save/deploy privately, verify terminal deployment status and stop dev server.

## Validation record

17 automated tests cover story order, protection and checkpoints, all seven areas’ target reachability, real ray/height blocking, obstacle-aware paths and the actual simulation loop from start to ending. The loop test substitutes WebGL/audio hardware boundaries, aims at real targets, checks held input and pause, and physically runs the corridor and parking sprint routes. Browser rendering and audio have not been manually playtested. Typecheck/lint/build passed before final packaging. Review found a buried fuse; moved it above the cabinet and added a geometric visibility regression.
