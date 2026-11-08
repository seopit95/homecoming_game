# Anatomical ghost head and fitted hair

The user has already authorised a whole-game commercial-quality overhaul, including replacing the ghost and redesigning art. This is the next coherent character pass within that continuing objective; it is not a commercial-ready certification.

## Evidence and choice

V44 campaign frame 76-car_crash shows an implausibly flat extended facial profile, a broad stretched mouth and a separate cap/card silhouette. Current ghost-face.ts makes a radial front sheet from a depth field and adds a half ellipsoid behind it. The repository already contains a licensed complete adult female head with eyelids, nose, lips, jaw, ears, skull and eye meshes (lib/assets/pedestrian-head.json), plus pinned CC0 MakeHuman source and an extraction script in external realism-2026-09-23. Prefer that anatomical source and authored deformation to another collection of ellipsoids or a new character-loading/animation framework. A paid/downloaded replacement introduces avoidable licensing, identity and rig integration work; cosmetic lighting alone does not repair the profile.

## Result

Replace the ghost's radial front-sheet/half-sphere head with a complete anatomically based feminine head. In ordinary walk/crawl, the side silhouette must contain a distinct forehead, projecting nose, lips, chin, jaw and connected rear skull/neck. The visible eyes must be actual recessed eye geometry seated behind lids. Preserve fictional accident staining, asymmetry, lowered damaged posture and long dark wet hair; do not turn the character into a clean beauty portrait. Match the front albedo to anatomical landmarks and avoid painted duplicate eyes, portrait wrapping behind the head or an abrupt facial-material seam.

Retain a disturbing, substantially enlarged mouth during capture and the passenger scare. Its rim belongs to the deforming skin, with connected cheeks/chin, closed recessed oral tissue, supported lower gum/teeth/tongue and no floating oval accessory. Author rest and gape from the same topology, preserving skull/upper face volume while lower face deforms. Opening must be continuous at 0 and through the simulation's slight overshoot; no frame may collapse through itself, expose rear body through the cavity, reverse surface triangles or leave a skull seam. Restore rest after attack/passenger poses. The legacy radial-grid vertex indexing is an implementation assumption, not a behavior to retain: move existing tests to explicit actual mouth-border/face-landmark data if needed without reducing behavioral coverage.

Fit scalp and long hair to the new anatomical head, including temple/neck-side volume and one readable uncanny eye. Roots meet the scalp and strands stay outside the face as the head tilts or opens. Hair follows gravity in standing, crawling, passenger and capture poses, retains floor support and pause determinism. Avoid visibly stepped crown bands, sawtooth edges and widely spaced rigid cards. Use the existing material preparation/ownership and existing hair/face rig boundaries; no new runtime library, fetch or general character framework.

## Boundaries and physical requirements

- Preserve createGhost/animateGhost/animateGhostAttack/animateGhostPassenger/animateGhostEmergence signatures, existing stage logic, pursuit/navigation, head-group animation contract and user settings. Do not enlarge the head group to manufacture a scare.
- Preserve existing wall/floor/door clearance and body/limb/clothing continuity behavior. Local head/hair fit adjustments are allowed; route, speed, door geometry, wardrobe and story changes are not part of this pass.
- Reuse existing CC0 anatomy and existing built-in generated textures; any derived mesh records its source hashes, transform, license and construction. Do not edit raster images with Python or add an unlicensed texture. If a new raster is truly required, report the need before changing the approach.
- Dynamic geometry, maps and materials remain world-owned and disposable. Ordinary animation must not allocate new meshes/geometries/materials per frame; temporary authoring data stays outside runtime.
- Keep final character draw calls no more than 20 above baseline at identical views/settings. Record triangles and warmed programs; this is an advisory submission budget, not an FPS claim. Source and browser checks must identify the exact candidate.
- Render a matched front, three-quarter and profile at rest and full gape, plus actual-game walking/crawling, standing/crouching capture, reduced-motion capture and passenger scare. Judge skin/hair/neck continuity in light where it can be seen. Preserve rejected candidates and compare before/after; test counts alone cannot approve the art.

## Validation and whole-goal limits

Tests must verify anatomical depth/profile, connected rim/cavity and seated eyes, continuous jaw/face/hair morphs, pause/repose and current physical clearances. Add only behavior checks needed by this representation change; migrate brittle grid-index tests transparently. Root verifies exact-source full suite/TypeScript/diff, actual-game natural encounter and the fatal ending before the authorised native Sites publication. The new head must survive the already existing campaign, not gain an isolated viewer-only solution.

V44's six documented minor issues, common-area/parking variety, other props, wider character/body art, first-time 30–40 minute pacing, subjective audio and cold/wider-device verification remain tracked in the broad goal. This pass resolves only the head/hair defect supported above.
