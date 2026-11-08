# Crawling pursuit and passenger ending

Goal: Preserve the indoor walking hunt, switch the pursuer to grounded crawling after the apartment threshold, and replace the final escape with boarding the player's car, a passenger reveal and a fatal collision.

Architecture: Reuse the existing Three.js ghost rig and road/car scene. Keep animation and dialogue on simulation time so manual pause works. Keep the elevator's committed boarding protection. The existing parking puzzles lead to a new driver-door target; saved legacy road checkpoints migrate to the new driving finale.

- [x] Add a regression test for low crawling bounds, planted alternating contacts, deterministic pause and restoration of the walking/attack rig. Implement a crawl blend on the existing animator and burst pursuit in the 28F gallery. Test the full playable elevator route.
- [x] Test parking car boarding and the three timed stages `car_escape`, `car_voice`, `car_crash`; ensure arbitrary interactions cannot skip them. Add a voiced passenger line and right-side positioning, a visible seated ghost, road obstruction, collision deformation and driver collapse/fade. Preserve the prologue.
- [x] Replace ending copy/UI, objectives, parking instructions and checkpoint mapping. Test full story progression, pause during the finale, audio ownership, restart and migrated saved progress.
- [x] Run the full test suite and typecheck; obtain a read-only review of the changed code. All 86 tests pass; the review found no remaining material issues after the crawl-floor and passenger-floor corrections.

Release procedure: Run the production build, package the validated output, publish to the existing audience, reuse the existing browser tab and stop the preview server.
