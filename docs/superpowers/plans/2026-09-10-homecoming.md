# Homecoming Implementation Plan

**Goal:** Deliver a playable short Korean first-person horror game.
**Architecture:** Pure story transitions drive a small Three.js world and native audio; React supplies menus and HUD.
**Tech Stack:** Sites/Vinext, React, Three.js, Web Audio, Node assert.
**Spec:** ../../design.md

## Global Constraints
- Project lives in /Users/kds_mac/PhpstormProjects/uninvited.
- No accounts, uploads, purchases, external sound files or external textures.
- Korean instructions, volume and brightness controls, pause, retry and full restart.

## Task 1: Complete story
- [x] Write `tests/story.test.mjs` asserting that premature exit cannot win; interactions advance in order; hiding protects; the survival timer enables escape; catching ends play; retry resets the radio checkpoint.
- [x] Run `node --experimental-strip-types --test tests/story.test.mjs` against a no-op transition stub; confirm assertions fail.
- [x] Implement `lib/story.ts` with `initialStory()`, `transition(state, action)` and `checkpoint()`.
- [x] Rerun and pass.

## Task 2: Playable world
- [x] Create `lib/world.ts` with apartment walls, doorways, collision bounds, furnishings, lights and interactive targets.
- [x] Create `lib/audio.ts` with bounded-volume ambient, interaction, threat and footstep audio.
- [x] Create `lib/game.ts` with movement, view controls, interaction range/occlusion, scripted escalation, hiding, pause and disposal.
- [x] Replace `app/page.tsx`, `app/globals.css` and `app/layout.tsx` with the game-native menu and HUD.
- [x] Show the first meaningful preview after an HTTP compile check.

## Task 3: Validate and deliver
- [x] Run story tests, TypeScript and production build. Fix failures before publishing.
- [x] Register minimal supported WebMCP pause/read tools; record lack of browser validation if context unavailable.
- [ ] Commit, push exact source, package, save and publish privately through Sites.
- [ ] Reuse the preview tab for the deployed game.
