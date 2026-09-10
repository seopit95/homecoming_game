# Shirasagi Heights visual update

The existing Korean solo escape route now takes place in a weathered Japanese apartment building. Gameplay directions remain Korean; environmental notices, building signs and prop labels use Japanese.

## Art assets

Three original images were made with the built-in image generator on 2026-09-10 and copied unchanged into `public/textures/`:

- `surfaces.png`: a 2×2 photographic material atlas of aged wallpaper, entryway tile, damp concrete and dark wood.
- `remains.png`: a 2×2 material atlas of pale bruised skin, stained nightdress fabric, wet black hair and injury marks.
- `face.png`: an adult fictional ghost's pale face, white eyes and wet black hair on transparency. The final face has no exposed injury detail.

The generated material atlases are sampled by a Three.js material shader. The face is mapped onto a curved head surface. Source images are decoded once; floor-specific texture clones and meshes are disposed when changing areas. A failed download produces the existing retryable loading error.

## Presentation

Asymmetric shoulders and limbs, individual fingers, a small narrow head with a forward-bent neck, a raised twisted arm and independently moving hair and dress replace the earlier mannequin-like figure. Strands partly obscure the face. Animation preserves the navigation root and freezes when paused. Reduced-motion preferences remove the abrupt head twitch.

The opening begins seated on the sofa, watching an original animated Japanese weather broadcast. After seven seconds the TV and domestic lights go out together; the player stands in a clear position with a flashlight. The breaker fails and the apartment remains dark. A phone call mentions the already-open front door; the player can investigate the radio and hide, or leave early into the pursuing ghost's path. Switching off the radio creates a short quiet interval before dragging/crying cues and the wardrobe objective.

The elevator hall, apartment wings, archive and garage have been expanded with columns, connected alternate paths, cabinets and vehicle lanes. Pursuit continues through the hall, stairs and archive. The ghost follows sight, running noise and the player's last known position; crouching behind cover with the flashlight off can break visual contact. Each pursuit area has a nearby retry point. Hip, knee and ankle poses are driven by distance travelled, with synchronized alternating footsteps.

Only player actions open the pause menu. Losing pointer lock or focus clears held inputs; a hidden tab suspends the simulation and audio silently. Explicit pause freezes the timers, walk phase and voice playback.

The apartment has a tiled entrance, slippers, umbrellas, an oshiire-style wardrobe and a rainy city window. Other floors have management notices, intercoms, handrails, moisture stains and utility fixtures. These decorative details preserve the existing escape route and interaction points.

Lighting uses a warm flashlight against cool fluorescent and rainy-night tones. Locally synthesized rain, filtered breathing, footsteps and occasional water drops support the existing cues and volume control. Four original Japanese search lines use the macOS Kyoko synthetic voice; a procedurally generated sobbing/moaning clip supplies the crying cue. These shipped WAV files need no speech service at runtime. Low-pass filtering, pitch reduction, stereo placement and a short echo support their timing. Korean voice subtitles are independent of objective text. Voice downloads may fall back to breath sounds if unavailable.

This remains a lightweight browser prototype with procedural 3D geometry and generated photographic textures, rather than a scanned environment or a motion-captured character.

## Verification

Automated checks cover the full story route, reachable interactions, chase navigation, line of sight, pause behavior and finite ghost poses. Type checking, lint and the production build are also required before deployment. These checks do not substitute for browser rendering or listening QA.
