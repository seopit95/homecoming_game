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

The 28th-floor exterior gallery is 64 metres long, with the elevator about 61 metres from the home. A low concrete parapet, rusty rails and downpipes, faded metal doors, old repair notices and uneven fluorescent light create an aged Japanese apartment setting. Repeated balcony slabs below the player and distant window lights establish the height. The central route stays clear and the parapet prevents stepping outside.

Passing the middle section triggers one exterior fall: an overhead scrape precedes a separate pale, crooked figure accelerating down past the railing. A descending filtered cry and rush of air recede into a distant impact. It does not relocate the pursuing ghost, stop movement, force the camera or pause the game. The event uses simulation time, freezes during manual pause/background suspension, does not repeat on backtracking, and resets with the landing checkpoint. The existing ghost model, photographic textures and city-window shader are reused.

The apartment wings, archive and garage have columns, connected alternate paths, cabinets and vehicle lanes. Pursuit continues through the exterior gallery, stairs and archive. The ghost follows sight, running noise and the player's last known position; crouching behind cover with the flashlight off can break visual contact. Each pursuit area has a nearby retry point. Hip, knee and ankle poses are driven by distance travelled, with synchronized alternating footsteps.

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

## Reference ghost revision · 2026-09-12

The user-supplied fictional adult ghost reference informs the revised silhouette: long wet black hair hanging past the shoulders, a tilted narrow head, pale cataract eyes, slack asymmetric arms, a wet ankle-length dress and bare feet. The existing navigation root, human head scale, articulated walk, falling apparition and story route remain compatible.

`public/textures/reference-face.png` is a single built-in ImageGen output based on that reference, copied unchanged. The output is 1254 × 1254 RGB, with a baked checker background instead of the requested alpha. The curved facial mesh samples only the inner oval (u/v mapping in `lib/ghost.ts`) to keep that background outside the rendered face; a 40,401-point UV sample found no bright neutral checker pixels. This replaces the loaded face texture without removing the prior asset. It shows a narrow grey face, milky eyes, bruising and blood from the temple/cheek and lips. New 3D blood streaks run over the collar and sleeves, and nine reused droplets animate on the simulation clock without allocating per-frame geometry.

The face and skull now divide at the lips. During contact the head turns forward, the lower jaw drops, and a concave dark mouth with a wet rim and separate upper/lower teeth opens between them. Shoulder and hair movement follow the lunge; the head is not enlarged. The capture camera now frames the full face and dropped jaw from 0.85 metres at the end of the lunge. Tests project the mouth rim and chin through the real game camera throughout the collapse, for standing/crouched players and both motion settings. All jaw and torso offsets reset in ordinary walking. Existing volume, pause, contact detection, reduced-motion preferences and the 3.2-second collapse are retained.

Image generation used the built-in tool with this prompt:

> Use case: photorealistic-natural. Asset type: exactly one square 1024x1024 transparent PNG facial albedo texture for a live Three.js 3D horror game character. Input image 1 is a character identity and material reference, not a scene to reproduce. Primary request: faithfully derive only the adult fictional supernatural woman's narrow face from the reference. Preserve recognizable narrow facial proportions, long delicate nose, high cheekbones, dirty translucent grey pallor, pupil-less milky cataract eyes inside dark sunken eye sockets, and small sinister CLOSED mouth. Composition/framing: orthographic straight-on frontal face, symmetrical UV-friendly pose with no tilt or perspective. Tightly framed face oval centered in the square: forehead top around y15%, chin around y85%, left/right facial edges around x15% and x85%, nose at horizontal center, closed lips centered around y68%. Include the full forehead and chin, with no neck, shoulders, dress or scenery. Genuinely transparent alpha outside the face oval; clean usable silhouette. Wet black hair only at the extreme facial edges plus a few thin strands; do not obscure eyes or mouth. Materials/textures: realistic pores, damp grey skin, subtle bruises, grime and moisture. Include realistic blood smeared under one eye, from a shallow temple/cheek accident laceration, and a little blood at a lip corner. This is a fictional adult supernatural accident victim in eerie photoreal Japanese horror prosthetic style. Lighting: diffuse and fairly even for use as a mesh texture, retaining natural facial relief without directional cast shadows. Constraints: no text, background scenery, clothing, shoulders, exposed organs or bones, graphic gore, giant screaming mouth, teeth bared, cartoon or doll appearance. Mouth MUST stay small and closed because a separate 3D jaw will animate. Produce ONE image only.
