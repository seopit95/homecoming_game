# Pedestrian head

`pedestrian-head.json` is a neutral adult Asian woman head from the official MakeHuman hm08 mesh plus `asian-female-young.target` at weight 1. It includes actual eyelid rims, nose, lips, jaw, ears and complete skull. No ghost deformation is used. Only head and separate eye meshes were extracted or rendered.

## Use

Top-level `position`, `index`, `uv`, `normal` form the skin BufferGeometry. Arrays are flat. The `eyes.l` and `eyes.r` objects have identical mesh fields and their `center` and `radius` values. Use the supplied normals, which smooth UV seams; computing normals again may create a faint seam. UVs refer to the original MakeHuman hm08 atlas, transferred after reduction; they are not a front-facing rectangular portrait map. No skin image is included.

Dimensions in meters: 0.177170 X × 0.230000 Y × 0.201708 Z. +Y is up; face points +Z. Origin is at the upper neck attachment. Bounding minimum is [-0.088585, -0.019939, -0.074329], maximum [0.088585, 0.210061, 0.127379]. The open neck ring is y=-0.019939, allowing overlap with a neck mesh. This head includes a short neck section; attach a separate neck below it.

4580 skin triangles plus 280 eye triangles = 4860 total. 256 KiB JSON. Hair, eyebrows, eyelashes, iris/pupil pigmentation and clothing are the owner rig's responsibility. The source eyes have a neutral open gaze. Eye centers: left [+0.030560, 0.101126, 0.090970], right [-0.030560, 0.101126, 0.090970]. Their front surfaces are near z=0.1054. Suggested living iris radius ~0.0058m and pupil radius ~0.0024m; the bundled eyeball helper surfaces can receive a procedural dark-brown iris material or iris meshes. Do not leave the eyeballs a single dark color. The small natural lip gap may use a recessed dark mouth cavity.

`pedestrian-head-qa.png` is a head-only geometry review (front, three-quarter, profile), with simple approximate materials; it is not a texture or finished character render. `extract-pedestrian-head.py` rebuilds the mesh and performs numerical assertions. `render-head-qa.py` renders only the delivered head. The local build helper fast-simplification 0.2.0 is stored under `source/tools`; it is not a game dependency.

## Provenance

All sources are pinned to MakeHuman Community commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`:

- [Base mesh](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
- [Asian female young adult shape](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/targets/macrodetails/asian-female-young.target)
- [Official licensing statement](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md), sections C and D

Both asset headers explicitly mark release as CC0 in September 2020. The license statement specifies CC0 1.0 Universal for the mesh, targets and derived outputs. No MakeHuman application program logic is included. Credits in source headers: Data Collection AB, Joel Palmius, Jonas Hauquier; target original copyright Manuel Bastioni; project MakeHuman Team. File SHA-256 hashes and exact source transforms are embedded in JSON metadata.
