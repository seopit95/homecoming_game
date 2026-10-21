# Real apartment escape implementation plan

**Intent:** Repair safe home hiding, replace robotic scream/refusal sounds, make the record mission understandable, and replace implausible post-stair facilities with a small apartment exit route.
**Architecture:** Keep accepted home/gallery/lift/upper-stair gameplay. Compress the remaining stair descent with an explicitly labelled, pauseable transition to1F. Use three compact replacement maps with existing matching passage geometry: foyer/guard office, adjoining document store, basement stair/vestibule, then existing B1 parking. Old resident/17F-office/courtyard/industrial routes leave the main campaign; old saves normalize to usable new stages.
**Constraints:** Automatic goal remains off. No new dependencies, no broad duplicate checks, no unrelated ghost/phone/title refactoring. Sites helper owns source commit/push/build/package. The design uses primary-source circulation/finish references, not an exact surveyed copy of one estate.

- [x] `lib/game.ts`: reproduce hidden-home breath death; remove forced ejection/capture while closed in home wardrobe. Early exit remains dangerous. Keep manual pause.
- [x] `lib/apartment-route.ts`, `story.ts`, `expansion-story.ts`, `preferences.ts`: safe preparation; annex map/key opens document access; three explicitly named records unlock replay; playback unlocks rear exit; basement stairs need no pump puzzle. Add remaining-stair travel stage and normalize legacy saves.
- [x] `lib/apartment-escape.ts`, `building.ts`, `expansion-world.ts`: replace three huge maps with supported, reachable rooms and actual two-flight descent. Match incoming/outgoing passage transforms and normalize B1 height at parking handoff.
- [x] `lib/audio.ts`, versioned WAVs and source metadata: raw adult female distress scream and expressive Korean refusal. Check PCM/decode/routing; explicitly distinguish generated audio from recorded acting and subjective listening.
- [x] Update story/room/notebook copy and remove obsolete action prompts from reachable route. Preserve the9-second survival revelation and car ending.
- [x] Run only changed home, route/save, station/door/height, audio and native handoff scopes. Read-only review; final types check (repair only on failure) and build once. Record retired contracts and exact source hashes; publish existing public Site; clean owned preview.

**Final review corrections:** Disable retired frame-edit shortcuts when no controller exists; keep archive playback/escape reading safe and arm pursuit only on successful exit. Both actual-input regressions failed before the fix and passed after it.
**Release evidence:** External `apartment-route-v126` receipts own exact source/deployment proof; source docs do not infer publication from a local build.
