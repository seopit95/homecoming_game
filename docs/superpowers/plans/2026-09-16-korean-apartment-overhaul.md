# Korean Apartment Overhaul Implementation Plan

> Execute inline as the Site-owning agent. Asset-only subagents prepare media outside the checkout; source and hosting remain with the owner.

**Goal:** Implement and publish all ten user requests as a cohesive harder horror game.
**Architecture:** Extend the existing story reducer and world target contract, replace building geometry using shared layout constants, preserve rendering/input/audio lifecycle. No new dependencies.
**Tech Stack:** TypeScript, Three.js, React, Web Audio, node:test, existing Sites hosting.
**Spec:** docs/superpowers/specs/2026-09-16-korean-apartment-overhaul.md

## Constraints
- Existing owner-only Site/project id, branch and deployment workflow.
- No automatic pause, no unrequested purchases, no unrelated original-checkout edits.
- Every required target reachable; open doors reveal connected space.
- Media used locally with source/license record; imagegen hand/cockpit/atlas requested concurrently.

## Work ledger
- [x] Inspect existing source and failure causes. Home has a small closed vestibule; elevator boundaries are continuous walls. Building scales are 6m-wide landing/30m corridor/50x86m parking. Old audio uses oscillator phone beep for both phone and radio.
- [x] Story: new wake/switch/torch phases, clue and mechanism puzzles. Extend Action/Stage and journal. Tests reject skipping required evidence/circuit order/car key/pump.
- [x] Runtime: torch pickup gate, wake camera, door state, stamina, code/tape/pump interactions, HUD. Tests exhaust/recover/pause and complete progression.
- [x] World: author narrow Korean building dimensions and portals; home switch/torch/damp dressing; update shared patrol/spawn/target references. Tests ray through open aperture and reach every required target.
- [x] Media: integrate generated human hand/cockpit/material atlas and licensed recordings. Prologue distracted glance, voice sync; phone/radio lifecycle.
- [x] Validation: adjust regression tests for intentional flow/layout changes, full node tests/tsc/build, representative visual QA and reviewer.
- [ ] Publication: exact source commit/push, archive, version, owner-only deploy, confirm succeeded, preserve live Site tab.

## Concrete checks
`node --experimental-strip-types --experimental-test-module-mocks --test tests/*.test.mjs`
`node node_modules/typescript/bin/tsc --noEmit`
`node node_modules/vinext/dist/cli.js build`

Story fixtures: skip_memory→wake_ring; awake→light_switch; switch→find_torch; flashlight→power; breaker→phone; then existing shoes/radio. Circuit sequence b,a,c only; wrong input clears sequence. CCTV timestamp index1 only unlocks key. Parking exit→key; car_search→pump; valve_a+valve_b→pump action→alarm→run→road_exit.
Stamina fixtures: moving sprint7seconds reaches0; stationary pause preserves; rested walking recovers; movement speed falls to walk when depleted.
Geometry fixtures: aperture centre→3m beyond has line of sight in landing/lift; closed home door blocks until hide/escape; staircase height matches each flight; all targets reachable with 0.23m player radius.

## Verification recorded before publication
- 71 node tests passed, including full story/runtime progression, stamina exhaustion/walking recovery/manual pause, portal sightlines, all interaction reachability and office ghost navigation.
- TypeScript no-emit check and production build passed. Existing large-bundle/route-classification notices remain nonfatal.
- Visual checks: hand, opening cockpit, home exit, open lift entry/exit, gallery, corridor, stairs, office and parking. Driver asset and hand use transparent photographic planes inside animated scenes; world geometry remains realtime Three.js.
- Browser UI checks:1280×720 and390×844, no horizontal overflow or page errors; desktop Esc and touch pause work. All5 new recorded WAV assets fetch/decode successfully.
- External review found two office navigation issues; widened doorway and moved a patrol point outside furniture. Reviewer independently verified corrections.
- First-play duration is a design target, not a measured15–25minute guarantee. End-to-end test uses direct interaction positioning for some investigation steps and actual movement for escape routes.
