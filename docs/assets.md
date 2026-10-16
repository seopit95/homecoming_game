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
