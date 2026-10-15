# Living pedestrian appearance

The living accident victim uses the official MakeHuman system assets
female_elegantsuit01 (the connected long-sleeve shirt only), bob02 hair and
young_asian_female skin. Their OBJ, binding and material headers explicitly
release them as CC0 in September 2020. The current
[official catalog](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
also lists these assets as CC0. Credit: MakeHuman Team, Data Collection AB,
Joel Palmius and Jonas Hauquier.

The base and adult Asian female shape are the same pinned sources documented
in [the original head credits](pedestrian-head-credits.md). Their exact hashes,
and the clothing/hair OBJ and binding hashes, are retained in
lib/assets/pedestrian-art.json. The original archive and raw assets remain
outside the production checkout.

Rebuild the derivative with the bundled Node runtime and existing Three:

    node scripts/author-pedestrian-art.mjs <extracted-system-assets> <pinned-body-dir>

The generator applies the supplied hm08 bindings using the original head
scale/origin. It retains the original complete head topology and UVs, smooths
coincident UV-seam normals, omits the source skirt, and derives shoulder and
forearm weights for the existing player-story rig. The upper chest/neck is
clipped from the same adult source, with 2 mm of overlap into the head.
Runtime blends its upper attachment with head rotation. No unclothed body
mesh is distributed or shown. A source-shaped trouser seat uses the existing
dark fabric material and overlaps the blouse hem and articulated thigh tubes,
so the waist does not remain an open gap during the collision pose.

The four pedestrian-v1 WebP maps are format conversions of the source skin,
shirt diffuse, shirt normal and hair diffuse atlases. Diffuse/skin maps are
2,048 square; normal/hair maps are 1,024 square. Pillow WebP quality is 92,
alpha quality 100. The normal map uses linear data color space; color maps
use sRGB. These are existing licensed assets, not newly generated portraits.
The full skin atlas is sampled only by the head and clothed upper-neck excerpt.

The distant CCTV driver retains the previous mesh. Its face color material
is now separate from its neck material so vertex-color state cannot blacken
the neck. Ghost face, hair, garment, navigation and sound remain unchanged.

These source and fitting details are not a whole-game commercial-quality
certificate. Head animation, environment variety, aftermath staging, audio
and first-player pacing still require their broader goal-level work.
