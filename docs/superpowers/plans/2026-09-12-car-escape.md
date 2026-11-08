# Car Escape Implementation Plan

Approved flow: collect the car keys at home, survive the existing building, locate the damaged car in B1, inspect the unpowered vehicle gate, restore power at the booth, lure the pursuer with the fire alarm, return to the car, then a stormy drive ends in a fatal collision when the passenger appears.

- [ ] Add bounded sprint stamina, exhaustion recovery, HUD and movement tests. Preserve pause and retry semantics.
- [ ] Replace solid walls behind operational doors with actual openings and visible connecting space; test sightlines and target reachability.
- [ ] Extend story transitions, inventory and checkpoints for keys, car, gate and booth; preserve earlier investigation.
- [ ] Rebuild B1 with parking bays, human-scale vehicles, structural columns, services and a vehicle ramp. Maintain walkable escape lanes.
- [ ] Replace the distant fall with an audible cue, a visibility-gated near fall and synchronized impact. Respect reduced motion.
- [ ] Reuse the existing driving scene for a distinct storm escape, passenger reveal and fatal ending. Test pause and terminal state.
- [ ] Run story, geometry and simulation tests, typecheck, lint, build, desktop/mobile rendering checks and publish the existing private Site.
