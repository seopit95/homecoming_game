# Realism and uninterrupted transitions

Requested scope: all twelve September 23 corrections. Preserve the existing campaign, saves, manual pause and fatal car ending.

1. Measure cold world construction and first render; prepare reusable worlds and road scenes before enabling play. Explicitly reset mutable doors, solids and story clocks on retry. Keep resources alive through asynchronous preparation and dispose once.
2. Replace the intro woman's rigid mannequin motion with an articulated, clothed pedestrian and a short bonnet contact / collapse sequence. Remove outside phone ringing and contradictory subtitles. Place the flashlight on the existing bedside furniture.
3. Remove walkway falling apparition and elevator fingers. Walk out of the pried elevator; stage the pursuer emerging from its ceiling. Audit every chapter threshold, physical doorway, spawn and heading.
4. Give the ghost visibly attached elongated arms and fingers; retain floor contact in crawl animation. Add stamina recovery breathing and a voiced, faster 1F exit pursuit.
5. Verify story progression, retry/reset, audio pause and disposal with tests. Inspect actual rendered intro, ghost, transitions and all doorway crossings, including cold frame timing. Build and publish the existing public Site.

Visual direction: restrained, physically connected movement in a decaying apartment. Horror comes from anatomical asymmetry, elongated extremities, staged reveals and sound timing; remove disconnected props and arbitrary jump scares.

Verification (2026-09-23):
- 118 automated checks pass, including the real interaction/state/navigation loop through the fatal ending, held elevator pry followed by walking out, crouched crossing, retry/reset, breath recovery, 1F shout, and backing up into a closing fire door.
- Browser UI: title ready, start, intro skip, apartment wake, manual pause and resume; no page errors or failed requests. A stale local Vite optimizer cache during parallel fixtures was isolated to a separate QA cache and the local preview restarted.
- Rendered before/after views inspected at nine chapter connections. Shared turning passages replace the empty stair preview and the blocked resident-to-office passage. 24F and 1F elevator previews switch independently, including after static geometry batching.
- Local Chrome at 1280x720: cached chapter swaps used about 1–5 ms CPU, first transition frames about 15–28 ms in the final measured run. An isolated cold-world baseline reached 0.6–1.6 s on several affected routes. These are development-machine measurements, not universal frame-rate guarantees. Startup now prepares all chapters and both road scenes before enabling play (observed 3–24 s depending on shader cache / concurrent QA).
- Original recording clips and MakeHuman-derived head asset provenance are documented separately. No extra runtime package was introduced.
