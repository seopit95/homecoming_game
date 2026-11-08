# Persistent apartment hunt

Implement the user's requested continuation in the existing Three.js game. Keep Korean controls and subtitles, the TV blackout, wardrobe escape and elevator failure. No dependencies or new hosting audience.

- [x] Reproduce involuntary pause from blur / pointer-lock loss. Remove those menu triggers; explicitly requested pause still freezes the simulation. A hidden tab suspends silently without showing a pause menu.
- [x] Keep the apartment dark after inspecting the failed breaker. Make the front door visibly open and permit an early exit through it; eliminate locked-door dialogue.
- [x] Expand the elevator hall to 22 × 40 m, the 24F floor to 30 × 78 m with two looping lanes around service blocks, the archive to 24 × 32 m, and the garage to 50 × 86 m. Preserve reachable exits and clues. Add partitions, rooms, cars and identifying signs.
- [x] Continue pursuit through the hall, stairs and office, with per-area checkpoints. Use sight, running noise and last known position so crouching behind cover is useful. Keep sufficient initial lead and a timed alarm distraction.
- [x] Add articulated hip, knee and ankle animation driven by distance travelled; synchronize alternating footfalls and cloth drag with that phase. Preserve pause and root navigation transforms.
- [x] Package original synthesized search lines and a sobbing cue as local audio. Apply quiet filtering, stereo placement and echoes. Schedule lines at hiding, losing sight and rediscovery; keep Korean subtitles separate from objectives and stop clips on scene change/restart.
- [x] Verify explicit pause, darkness, open-door transitions, broad-area pathfinding, crouch visibility, walk-cycle continuity and the physical escape routes; run type check, lint and build. Request bounded independent review before privately publishing the exact validated source to the existing Site.

Files: `lib/game.ts` owns the simulation and event timing; `lib/story.ts` owns progression/checkpoints; `lib/world.ts` and `lib/building.ts` own geometry; `lib/navigation.ts` owns pathfinding; `lib/ghost.ts` owns the walk rig; `lib/audio.ts` owns playback. `app/page.tsx` and `app/globals.css` expose crouch and voice subtitles. Audio lives under `public/audio/`. Existing Node tests exercise the actual simulation while mocking hardware boundaries.

Validation completed with 26 automated checks, including the physical corridor and garage sprint routes, plus independent static review. Browser rendering/listening QA was not performed. Private publication follows the successful production build.
