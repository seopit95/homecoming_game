# Character and audio asset provenance

`lib/assets/ghost-anatomy.json` contains derived adult female hand/foot surfaces and a facial depth field from MakeHuman Community assets:

- Base: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Shape: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/asian-female-young.target
- License: **CC0 1.0 Universal**, confirmed by embedded asset headers and https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md . No MakeHuman application code is incorporated.

The data was fitted to the game's original clothed character rig, with finger curl, a facial mouth morph, asymmetrical shoulders and original hair/garment geometry. Source asset copyright credits: MakeHuman Team, Data Collection AB, Joel Palmius and Jonas Hauquier. Only the derived anatomy data is shipped, not the downloaded base source or candidate models.

`public/textures/ghost-face-v4.png` and `ghost-surfaces-v4.png` are original built-in image-generation outputs, used as albedo textures. Prompts and intended use are in the 2026-09-23 encounter plan. They depict fictional horror makeup and stained clothing.

`public/audio/chase-score.wav` is an original 30.476-second stereo composition rendered at 32 kHz, 126 BPM: detuned low-string ostinato, dissonant bowed/brass clusters, synthesized drums and metallic percussion with stereo delay. It uses no sampled commercial music or external recordings. The reproducible authoring script is `scripts/compose-chase.py`.

### Anatomical ghost head (V45)

`lib/assets/ghost-head.json` is a CC0 derivative of the bundled complete MakeHuman
adult female `pedestrian-head.json`, not the earlier front depth sheet. Its
metadata retains the original pinned commit/source hashes and records the bundled
input SHA-256 and head-local transform. `node scripts/author-ghost-head.mjs`
rebuilds it deterministically using Node and the already installed Three.js.
No downloaded body, new raster or runtime dependency was added.

The derivative welds the source seams, keeps the skull/ears/lids/nose/jaw, tapers
the neck attachment, replaces the sealed internal mouth with a stitched local
lip patch and bakes monotone anterior-jaw deformation coefficients. The source eye
meshes remain separately seated in their sockets with shader-painted clouded
irises. The existing generated face-v4 portrait is projected by anatomical
landmarks, blended to sampled skin behind the temples, and never wrapped across
the rear skull. Original skin/head licensing is in `pedestrian-head-credits.md`.

Hair collision/scalp envelopes are ray-baked from this same complete geometry;
they do not generate the visible skin. Fitted scalp hair and varying wet clumps
remain procedural, world-owned and disposable. The face, oral and hair position
buffers are reused through rest/gape and all existing poses; head-group scare
scaling and navigation/body collision behavior are unchanged.
