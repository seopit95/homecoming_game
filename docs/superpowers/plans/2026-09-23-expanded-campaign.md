# Expanded campaign implementation plan

**Goal:** Expand the playable story and map content toward a 30–40 minute first playthrough while retaining the fatal passenger ending and existing pursuit/door fixes.
**Architecture:** Reuse the Three.js collision/target/navigation/audio system and explicit story state machine. Add four authored spaces, physical outgoing vestibules, a service-lift connection, evidence and mechanism puzzles, and per-stage local checkpoints. No new dependency or external service.

## Content and pacing

Existing home, gallery, lift, stairs and victim apartment: estimated 10–12 min. Management office and service lift: 3–4 min. Ground-floor communal facilities: 4–5 min. Outdoor courtyard: 6–8 min. Basement records/storage: 4–5 min. Mechanical plant and final parking escape: 4–6 min. These are first-play design estimates (approximately 30–40 total), not a measured population average; a player who knows every answer can finish faster. No artificial minimum completion timer.

- The service lift connects 17F to 1F. Its door opens before the player crosses into the next world.
- Communal facilities: restore the intercom, find the victim's badge and a returned notice, listen to the failed call, identify 2803 as the call's destination, unlock the courtyard route.
- Courtyard: 64 × 96 m construction courtyard with east/west detours, guard booths, emergency phone, playground evidence, and a four-digit safe. Cross-reference arrival minutes with the duty extension; the opened safe reveals the protagonist tried to delete the recording. Walk down the physical basement stairs.
- Records: collect road/call/entry records, arrange the three events chronologically, replay the omitted emergency-call record, escape the awakened pursuer.
- Plant: inspect the pipe diagram, isolate two supplies, select pump and ventilation circuits (outside lights must remain off), drain the flooded exit, cross into parking.
- New maps have connected loop routes, distinct rooms, grounded props, readable diegetic directions, and threat activation after a readable exploration opening. Three broad main corridors alone do not constitute the expansion.
- Completed plant drainage removes the redundant legacy parking pump objective. Existing saves in the old parking sequence remain valid.

## Tasks

- [x] Story: add typed stages/actions, evidence, contextual objectives/dialogue, puzzle guards, retry/save support. Tests must catch premature exits, incorrect ordering, repeat evidence, and lost progress.
- [x] World: add `lib/expansion-world.ts` with annex/courtyard/archive/plant builders and room-specific props. Use real open vestibules and animated doors. Test all required targets have a collision-free approach and door blocking matches its state.
- [x] Game: connect service elevator and walking thresholds, integrate pursuit patrols/noise/music and mechanism feedback. Preserve manual pause, contact death, crawling outside the first home, original ending.
- [x] Verification: full state route, real movement/interaction across new chapters, save/retry at intermediate steps, floor-supported props, browser renders and performance. Independent read-only review; address blockers.
- Delivery after verification: update visible chapter information, build and publish the existing public Site; report playtime as an estimate until human playtest data exists.

## Verification and pacing evidence

- Independent review: all target approaches/exit routes reachable with player radius 0.23; 52 reachable story states retained notes, code and circuit input through save/retry.
- Shortest clue-valid route through the four new areas: 820.1 m, about 6:50 walking at 2 m/s before reading, puzzle input, hesitation and retries. Other valid clue orders reach about 9:33 walking. A real-input simulation with sprint/stamina and known answers cleared the new chapters in about seven minutes. This is not a first-play measurement.
- Mandatory archive replay is 32 seconds, with a shared cue table for monitor text and subtitles. Pause stops it. Interrupted replay saves return to the monitor objective; the previously collected record can be replayed.
- The courtyard supplies a large part of traversal time. Do not enlarge it further just to pad duration. The 30–40 minute first-play target remains a design estimate until measured blind human playtests.
- Browser: actual title/continue/UI at five checkpoints, code/circuit restoration and manual pause, no page errors. Four new worlds visually inspected from eleven positions. Desktop Chrome render samples: frame median roughly 16.7 ms, p95 below 20 ms; this is representative scene rendering, not a guarantee across devices or a full chase benchmark.
- Narrative review fixes: chronological replay alignment, immediate safe revelation, no nonexistent family photo, contextual parking instructions/journal/flood so completed drainage is not repeated.
- Physical review fixes: courtyard stair-floor opening, walkable door jambs, mailbox pedestal/backing, desk-chair feet, pipe mounting and valve connections.

Final regression before packaging: 115 tests passed, including real-input traversal to the fatal ending, repeated archive playback after continue, and legacy/new parking drainage. TypeScript check passed.
