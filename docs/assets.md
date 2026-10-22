# Character and audio asset provenance

`lib/assets/ghost-anatomy.json` contains derived adult female hand/foot surfaces and a facial depth field from MakeHuman Community assets:

- Base: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Shape: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/asian-female-young.target
- License: **CC0 1.0 Universal**, confirmed by embedded asset headers and https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md . No MakeHuman application code is incorporated.

The data was fitted to the game's original clothed character rig, with finger curl, a facial mouth morph, asymmetrical shoulders and original hair/garment geometry. Source asset copyright credits: MakeHuman Team, Data Collection AB, Joel Palmius and Jonas Hauquier. Only the derived anatomy data is shipped, not the downloaded base source or candidate models.

`public/textures/ghost-face-v4.png` and `ghost-surfaces-v4.png` are original built-in image-generation outputs, used as albedo textures. Prompts and intended use are in the 2026-09-23 encounter plan. They depict fictional horror makeup and stained clothing.

V103 loads lossless WebP copies of `environment-v3`, `ghost-face-v4`, `ghost-surfaces-v4`, `hand-skin`, and `hand-view` to reduce startup transfer. Resolution and decoded RGBA pixels match the retained PNG originals exactly; provenance and usage rights are unchanged. The five fetched files total 8,700,168 bytes instead of 12,625,497 bytes. Pixel equality and encoding sizes are recorded in the V103 `lossless-textures.json` evidence.

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

### Authored long hair and cotton garment (V48)

`lib/assets/ghost-hair.json` replaces the procedural scalp cap and 96 radial
ribbon locks with the official MakeHuman **long01** hairstyle: 18 authored mesh
islands, 3,314 UV-seam vertices and 4,108 triangles. The OBJ, binding and material
headers explicitly release the asset as CC0 in September 2020. The
[official asset list](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
also identifies long01 as CC0. Credits: MakeHuman Team, Data Collection AB,
Joel Palmius and Jonas Hauquier. Exact source hashes and the official archive
URL are retained in the mesh metadata.

`node --experimental-strip-types scripts/author-ghost-hair.mjs <long01-directory>
<pinned-base-and-target-directory>` applies the supplied hm08 barycentric
bindings to the same pinned adult female shape used by the existing head.
Nearby hair is fitted outside the complete skin surface and bound to its actual
jaw deformation during authoring. Runtime keeps scalp attachments rigid,
lets loose ends bend below the jaw and drapes seated lengths in front of the
backrest. The old front-only skin raster and projection are no longer used.
The face, jaw shape, navigation, limb animation and story remain unchanged.

`public/textures/ghost-hair-long01-v1.webp` is the source's RGBA diffuse atlas,
transcoded with WebP quality90 and alpha quality100. Its original transparent
strand edges are retained. `public/textures/ghost-cloth-v5.webp` is an original
built-in ImageGen output, transcoded at quality90, 1,254×1,254 pixels: two
full-bleed panels of soaked ivory cotton, fine vertical creases, seams and
uneven rust-brown accident stains at the shoulder/hem. It replaces the repeated
cloth tile without changing garment geometry. The generated standalone hair
swatch was rejected and is not shipped. These are material/hairstyle changes,
not commercial character-art or whole-game completion acceptance.
# V49 — continuous authored nightdress

The ghost's old radial bodice and two independent pointed sleeves are replaced by a single authored garment derived from WDG's **Mycenaean_Tunic**, in the official [dress01 CC0 asset pack](https://static.makehumancommunity.org/assets/assetpacks/dress01.html), downloaded from [the pack's first mirror](https://files2.makehumancommunity.org/asset_packs/dress01/dress01_cc0.zip). Credit: **WDG / MakeHuman Community**. The current official pack catalog lists this exact asset as CC0. The source MHCLO retains its older AGPL3 header; the external provenance record preserves both the original header and the current catalog, rather than rewriting the source header or claiming it says CC0.

`scripts/author-ghost-dress.mjs <tunic-dir> <pinned-base-and-target-dir>` fits the supplied hm08 bindings to the same pinned adult Asian female source as the ghost head, extends the skirt, and bakes cuff-to-bodice arm weights. It needs Node and the existing Three dependency only. The compact derivative is `lib/assets/ghost-dress.json`: 1,558 UV-seam vertices, 2,660 triangles; the source position topology is one connected garment with neck, hem and two cuff openings. Original raw assets stay outside the production checkout. Hashes and the transformations are embedded in the derivative metadata.

Runtime shoulder skin beneath the opaque sleeves is omitted by triangle row, retaining the exposed elbows, forearms and wrist seams. A clavicle/neck excerpt from the same pinned CC0 MakeHuman body supplies the visible skin inside the open collar; it is clipped to the collar aperture and its upper edge blends into the moving neck bridge. The joined garment follows the existing arm rig and lower-body support guides. Sitting gathers the skirt over the real cushion and in front of the inclined seat bolsters in the figure's frame. The wet cotton bitmap from V48 is reused; no new raster or runtime dependency is introduced. These local art/physical improvements are not a whole-game commercial-quality certificate.

### V50 — rotating mandible and source-shaped mouth boundary

The same pinned CC0 head now carries mandibular skin weights instead of the old
linear jaw-stretch deltas. Its irregular oral excision is smoothed along the
source face and joined by polar direction, preserving the original philtrum
and cheek form more closely than the earlier prescribed ellipse. The inner
lip fits within that boundary. Skull, lids, eyeballs and the posterior neck
attachment retain their established rig and scale.

The lower face, lower dental arch and oral floor turn around a shared jaw
frame, with a small asymmetric shift. The upper lip curls slightly during a
scream, blending into the surrounding connected skin. Roof, floor and lip
rim derive from the actual fitted lip; the tongue is supported on the posed
floor behind the incisors. The long01 hair fit and its deformation are rebaked
against the new skin using the existing pinned sources. Original face/hair
bitmaps and the V49 garment remain in use. No new external asset, raster or
runtime dependency is introduced. Representative geometry and art checks do
not establish commercial character quality or whole-game completion.

### V82 — anatomical exposed arms

`lib/assets/ghost-arms.json` contains adult female elbow and forearm surfaces
from the same pinned CC0 MakeHuman base and Asian female shape as the existing
head. Source hashes, commit and credits are embedded. Rebuild with
`node scripts/author-ghost-arms.mjs <pinned-base-and-target-directory>`.
No source torso, new texture, remote dependency or application code is shipped.

The source radial shape is retained while the bone axes fit the deliberately
long 46cm upper arm and 49cm forearm. Hidden skin starts about29cm below the
shoulder, beneath the existing opaque sleeve. The exposed skin uses361vertices
and678triangles per arm, plus a22vertex boundary stitched to the existing hand.
This replaces the ghost's spline tubes; the living pedestrian's clothing is
unchanged. Skin UVs continue the hand's local projection into the existing
generated skin atlas.

Runtime blends rotation around the shared elbow over a broad anatomical bend,
preserving radial volume instead of linearly crushing the inner elbow. The
distal skin turns into the palm frame and its actual boundary is joined without
an open seam. Normals are smoothed across both stitch boundaries. Existing long
fingers, nails, skeletal poses, wall-avoidance IK, navigation and story remain.
Changed-surface checks and native crawl/capture images are bounded character
evidence, not whole-game completion or a commercial-art certificate.

### V84 — seated asymmetric eyelids and anatomical dental arches

`lib/assets/ghost-teeth.json` derives the 32 separate **teeth_base** crowns from
the same official CC0 system-assets archive already used for long01 hair. Both
the OBJ and MHCLO explicitly release the asset as CC0 in September 2020; the
material header does the same for its diffuse image. Credits: MakeHuman Team,
Data Collection AB, Joel Palmius and Jonas Hauquier. Original source hashes,
body source commit and bindings are retained in the derivative metadata.

`node scripts/author-ghost-teeth.mjs <teeth_base-directory>
<pinned-base-and-target-directory>` reproduces the crowns through the supplied
hm08 barycentric bindings and the existing adult female head transform. The
large source oral lining is omitted; the game's supported cavity, tongue and
shared jaw frame remain. The fitted upper and lower arches have incisors,
canines and posterior molars, replacing the sixteen procedural oval crowns.
`ghost-teeth-v1.webp` is the source diffuse atlas encoded at WebP quality90;
it adds no new remote or runtime dependency. Crowns retain authored root,
occlusal shape and UVs, with a muted wet enamel material.

The existing face skin also receives a local asymmetric lid/brow and soft
tissue shape while both eyeballs remain seated in their original sockets.
The posterior skull, scalp and lip attachment are preserved. The lower face,
dentition and supported oral floor share a slightly asymmetric turning jaw;
upper lip strain is shared by its skin, rim and cavity. Existing face, skin,
hair and garment textures are retained. These are bounded face/scare changes,
not full-character or whole-game commercial-quality acceptance.

### Connected ghost body and anatomical legs

`lib/assets/ghost-neck.json` now contains the connected native adult female
neck, thorax, abdomen, pelvis and proximal limbs from the same pinned CC0
MakeHuman body/target above: 2,249 vertices and 4,354 triangles. The original
52-point head cut, humerus cuts and both 27-point femur cuts are paired with
the actual posed head, arms and legs, including shared lighting normals.
`lib/assets/ghost-legs.json` retains the source thigh, kneecap, shin and calf
surfaces (580 vertices / 1,111 triangles per side). Only the longitudinal
axes fit the existing 42cm / 42cm bones. Short native ankle bridges join the
retained anatomical feet. The old lathe thighs/calves and knee spheres are
removed; no new runtime package or remote asset is required.

`scripts/author-ghost-legs.mjs <pinned-body-directory> <pinned-rig-directory>`
and `scripts/author-ghost-neck.mjs` with the same arguments reproduce these
derivatives. `scripts/source-rig-weights.mjs` validates the original CC0 rig
and vertex weights at body commit
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. Rig SHA256 values are
`99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24`
(`default.mhskel`) and
`0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625`
(`default_weights.mhw`). Original weights are normalized and transferred
through the garment's source barycentric bindings. The reduced live rig
drives upper-arm descendants while leaving the source clavicle/shoulder
girdle on the thorax; this is a retargeted approximation, not the full
original 163-bone skeleton. The head turns about its source cervical joint.

The captive jaw retains its large rotation and advances as it opens instead
of retracting through the neck. The seated character leans forward, braces
one hand on her lap and reaches toward the driver with the other. Feet are
planted ahead of the seat frame; native lower skin and wet lengths follow
the cushion/bolster envelope. Private skin compression beneath opaque cloth
is not a claim of a full physical soft-body simulation. These changes do not
establish finished character art, whole-game quality or 30–40 minute pacing.

## Shared opening / escape street (V95)

The two road sequences now share varied old shop frontage and a 28-floor
apartment estate, while retaining their existing cinematic paths. Wet asphalt
uses Poly Haven [Asphalt 03](https://polyhaven.com/a/asphalt_03), by Charlotte
Baglioni and Dario Barresi, under [CC0](https://polyhaven.com/license). The
1K JPEG diffuse, OpenGL normal and ARM maps are local static files; no runtime
API or external image request is made. Mapping preserves the source 2m width;
wet roughness and subtle normal strength are artistic adjustments. Existing
photographic paving, plaster and weathered concrete are reused.

- public/textures/pbr/asphalt-color.jpg · [source](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_03/asphalt_03_diff_1k.jpg) · SHA256 95ad02e2631c41cf9fdd6a37596cf75adb4fb8a8b6880567cc78ed1c41dc5681
- public/textures/pbr/asphalt-normal.jpg · [source](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_03/asphalt_03_nor_gl_1k.jpg) · SHA256 978de8349ce2e9989325099a6fd1f5ea6b2826528e1264606a5c51296b1e2888
- public/textures/pbr/asphalt-arm.jpg · [source](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_03/asphalt_03_arm_1k.jpg) · SHA256 36e898a43fd828e71f5bc08fa0f86dc2c7338194c87eb6a2b30d7216318b9f31

### Player footstep bank (V111)

`public/audio/footsteps/bank.wav` derives 16 short variants from Kenney's [Impact Sounds](https://kenney.nl/assets/impact-sounds), licensed CC0 1.0. The original licence is retained beside the bank. `sources.json` records each original ZIP path/hash and the derived bank hash. Wood and concrete are sole-contact samples; light metal impacts and snow/slush foley provide quiet material layers for metal and wet surfaces. Tile uses a brighter concrete contact plus a short reflection. These are designed foley samples; no claim of site-specific location recording is made.

`python3 scripts/import-footsteps.py /path/to/kenney_impact-sounds.zip` reproduces the 24 kHz mono PCM bank with macOS `afconvert`. Trimmed clips have normalized peaks and faded edges; the bank is 155,682 bytes. `lib/footstep-bank.json` stores offset/duration regions. Playback avoids immediate variant repeats and slightly varies pitch; actor footsteps retain the existing procedural ghost sounds. Existing `player-breath.wav` is reused with gradually changing level, playback rate and filtering. No new voice recording or external runtime dependency was added.


### Chase and finale additions (V127)

The incoming smartphone ring is an original procedural marimba phrase in
`lib/smartphone-audio.ts`; it contains no Apple recording. The user selected
this approach. New sounds and their source licences/hashes are recorded in
`public/audio/ghost-v127/sources.json`. Metal scraping and the male reaction
use CC0 recordings; the existing chase scream is retained with a20% level
increase, while capture uses a separate short impact. The passenger's Korean
line is a locally generated synthetic approximation, not an actress recording.
The connected generation service rejected this request as paid-plan-required;
no upgrade or credit purchase was made. No natural acting/listening acceptance
is claimed.

`public/textures/ghost-passenger-v127.webp` is an original AI-generated
1024×1536 alpha head/neck portrait (484,102bytes), made with built-in ImageGen
for the final seated passenger. A small curved alpha surface follows the
native head anchor; the existing3D seated body/dress remains. The previous
head is a loading fallback until the local texture is prepared. This is a
passenger-only hybrid image/mesh treatment, not a fully reconstructed3D face
or a replacement of the roaming pursuer. Prompt/source metadata and native
composition evidence are retained externally in
`quality-2026-10-22/chase-finale-v127/vehicle/passenger-portrait-evidence.json`.

The garage door's trim, seals, hinge/latch and sill belong to the moving door;
the ending dump truck is authored geometry (`lib/dump-truck.ts`). No third
party truck model, new runtime package or external runtime request was added.
The V85 historical hand-reach ending is replaced here by a passive passenger,
male reaction, continuous forward camera turn and head-on truck collision.


### Original epilogue still (V128)

`public/images/ending-aftermath-v128.webp` is an original built-in ImageGen
cinematic aftermath still,1672×941 and227,538bytes. One correction removed
the truck from the static aftermath because its generated direction
contradicted the existing head-on collision. Only format conversion to WebP
followed; no frame or sound from another horror game is included. The image
is mounted after second2 of the crashed epilogue, outside initial graphics
preparation/preload hints. It is a still-image treatment, not a new3D scene.

Editorial references: Silent Hill2's final-letter/fade/credits structure
([script reference](https://www.silenthillmemories.net/sh2/script_en.htm)) and
SOMA's final-scene/credits/aftermath recontextualisation
([Tampere Universities PlayLab analysis](https://blogs.tuni.fi/playlab/features/the-ending-of-soma-and-why-its-excellent/)).
Only the pacing idea is used; the on-screen report, imagery and text are
original to this game's existing crash/passenger story.
