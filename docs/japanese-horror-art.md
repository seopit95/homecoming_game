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

A 22.5-second first-person memory opens the story: the protagonist drives home drunk in the rain, fatally hits a pedestrian, flees and sleeps in the apartment. Procedural road geometry, headlights, wipers, a falling silhouette and fractured glass depict the collision without an interactive driving challenge. The memory advances on the simulation clock, supports manual pause/background suspension, and can be skipped into the TV scene; retries retain their original nearby checkpoints.

Three nights later the protagonist is seated on the sofa, watching an original animated Japanese news broadcast about the hit-and-run. After seven seconds the TV and domestic lights go out together; the player stands in a clear position with a flashlight. The breaker fails and the apartment remains dark. A phone call recalls the driver’s failure to stop; the player can investigate the radio and hide, or leave early into the pursuing ghost's path. Switching off the radio creates a short quiet interval before dragging/crying cues and the wardrobe objective.

The elevator hall, apartment wings, archive and garage have been expanded with columns, connected alternate paths, cabinets and vehicle lanes. Pursuit continues through the hall, stairs and archive. The ghost follows sight, running noise and the player's last known position; crouching behind cover with the flashlight off can break visual contact. Each pursuit area has a nearby retry point. Hip, knee and ankle poses are driven by distance travelled, with synchronized alternating footsteps.

Hiding preserves the ghost’s current position. It walks to a search point about 1.4 metres from the hidden camera, inspects the wardrobe, then walks to the bathroom. Search and voice timing starts after arrival. Seeing or hearing the exposed player interrupts the bathroom route; contact is checked before and after navigation and interactions, without timer-based immunity. Walls and closed-wardrobe hiding still block contact.

Only player actions open the pause menu. Losing pointer lock or focus clears held inputs; a hidden tab suspends the simulation and audio silently. Explicit pause freezes the timers, walk phase and voice playback.

The apartment floor is now approximately 18.67 × 17.68 metres (330 m², approximately 100 pyeong), twice its former area. Walls and room positions expand along both axes by √2. Furniture assemblies, doors, the ghost and player heights keep their original human scale. An open lounge, kitchen and dining space replace the former narrow partitions. A study, bedroom, utility room and bathroom connect through wide openings. Shared layout anchors keep targets, spawns and wardrobe search positions aligned. The apartment has a tiled entrance, slippers, umbrellas, an oshiire-style wardrobe and a rainy city window. Other floors have management notices, intercoms, handrails, moisture stains and utility fixtures. These decorative details stay alongside the revised escape routes.

A separate ominous layer of detuned low tones, slow amplitude pulses and filtered wind fades in when the ghost appears, while the ordinary rain becomes quieter. Proximity increases that layer. It shares the master volume and AudioContext suspension and fades out on restart or ending.

Lighting uses a warm flashlight against cool fluorescent and rainy-night tones. Locally synthesized rain, filtered breathing, footsteps and occasional water drops support the existing cues and volume control. Four original Japanese search lines use the macOS Kyoko synthetic voice; a procedurally generated sobbing/moaning clip supplies the crying cue. These shipped WAV files need no speech service at runtime. Low-pass filtering, pitch reduction, stereo placement and a short echo support their timing. Korean voice subtitles are independent of objective text. Voice downloads may fall back to breath sounds if unavailable.

Contact now enters a 3.2-second death sequence: the ghost lunges into view with a stretched mouth, blank eyes and irregular head, hair and arm convulsions; the player’s viewpoint collapses toward the floor before fading to the retry screen. The existing human head scale is preserved. Reduced motion reduces shaking and camera roll. Movement and interactions are locked during this sequence, while explicit pause and background suspension still freeze it. An original glottal/formant scream WAV plays once on contact through the bounded master volume. All ghost navigation speeds are reduced by 15%.

The current narrative replaces the former 2012 murder/child story. The phone, wet shoes, stair note, accident log and CCTV tie the ghost to the recent fatal hit-and-run. The log identifies the driver as the 2803 resident and the victim as a 1704 resident. CCTV reveals that the victim followed the driver home from the passenger seat. The final exit opens onto the same crossing at 03:17. Environmental notices and the ending match this continuity. The damaged black car is parked beside the final exit, with a dented hood and fractured windshield.

This remains a lightweight browser prototype with procedural 3D geometry and generated photographic textures, rather than a scanned environment or a motion-captured character.

## Verification

Automated checks cover the full story route, reachable interactions, chase navigation, line of sight, pause behavior and finite ghost poses. Type checking, lint and the production build are also required before deployment. These checks do not substitute for browser rendering or listening QA.
