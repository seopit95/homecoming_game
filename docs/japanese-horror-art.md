# Shirasagi Heights visual update

The existing Korean solo escape route now takes place in a weathered Japanese apartment building. Gameplay directions remain Korean; environmental notices, building signs and prop labels use Japanese.

## Art assets

Three original images were made with the built-in image generator on 2026-09-10 and copied unchanged into `public/textures/`:

- `surfaces.png`: a 2×2 photographic material atlas of aged wallpaper, entryway tile, damp concrete and dark wood.
- `remains.png`: a 2×2 material atlas of pale bruised skin, stained nightdress fabric, wet black hair and injury marks.
- `face.png`: an adult fictional ghost's pale face, white eyes and wet black hair on transparency. The final face has no exposed injury detail.

The generated material atlases are sampled by a Three.js material shader. The face is mapped onto a curved head surface. Source images are decoded once; floor-specific texture clones and meshes are disposed when changing areas. A failed download produces the existing retryable loading error.

## Presentation

Asymmetric shoulders and limbs, individual fingers, a canted head and independently moving hair and dress replace the earlier mannequin-like figure. Animation preserves the navigation root and freezes when paused. Reduced-motion preferences remove the abrupt head twitch.

The apartment has a tiled entrance, slippers, umbrellas, an oshiire-style wardrobe and a rainy city window. Other floors have management notices, intercoms, handrails, moisture stains and utility fixtures. These decorative details preserve the existing escape route and interaction points.

Lighting uses a warm flashlight against cool fluorescent and rainy-night tones. Locally synthesized rain, filtered breathing, dragging footsteps and occasional water drops support the existing sound cues and volume control. Ghost sounds pan relative to the direction the player faces.

This remains a lightweight browser prototype with procedural 3D geometry and generated photographic textures, rather than a scanned environment or a motion-captured character.

## Verification

Automated checks cover the full story route, reachable interactions, chase navigation, line of sight, pause behavior and finite ghost poses. Type checking, lint and the production build are also required before deployment. These checks do not substitute for browser rendering or listening QA.
