# Character and audio asset provenance

`lib/assets/ghost-anatomy.json` contains derived adult female hand/foot surfaces and a facial depth field from MakeHuman Community assets:

- Base: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Shape: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/asian-female-young.target
- License: **CC0 1.0 Universal**, confirmed by embedded asset headers and https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md . No MakeHuman application code is incorporated.

The data was fitted to the game's original clothed character rig, with finger curl, a facial mouth morph, asymmetrical shoulders and original hair/garment geometry. Source asset copyright credits: MakeHuman Team, Data Collection AB, Joel Palmius and Jonas Hauquier. Only the derived anatomy data is shipped, not the downloaded base source or candidate models.

`public/textures/ghost-face-v4.png` and `ghost-surfaces-v4.png` are original built-in image-generation outputs, used as albedo textures. Prompts and intended use are in the 2026-09-23 encounter plan. They depict fictional horror makeup and stained clothing.

`public/audio/chase-score.wav` is an original 30.476-second stereo composition rendered at 32 kHz, 126 BPM: detuned low-string ostinato, dissonant bowed/brass clusters, synthesized drums and metallic percussion with stereo delay. It uses no sampled commercial music or external recordings. The reproducible authoring script is `scripts/compose-chase.py`.
