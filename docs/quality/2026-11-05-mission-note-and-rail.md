# 2026-11-05 · Quiet mission note and complete elevator-side rail

## Requested changes

Removed the automatic center objective notice and the persistent upper-left objective from the actual gameplay HUD. Location/floor/time remain. The current mission now appears only when the player opens the notebook-shaped upper-right button or presses Tab during active play. No mission change automatically opens the paper. The old on-screen hints toggle is no longer exposed; its saved setting remains compatible, while the note always uses the authoritative current mission.

The note is a native modal dialog styled as a worn, folded letter. It uses bundled handwriting faces for all four supported languages, with legible ink, real glyph coverage and no runtime font service. `app/mission-note.tsx` / `app/mission-note.css` own this presentation. The game pauses while it is read. Escape, the close button and Fold away resume play; focus returns to the invoking control. The evidence notebook remains accessible with J and from a button on the paper. Settings also has a mission-note action. Dialog keys cannot reach movement or the game's pause-toggle handler.

`GameHud` no longer contains objective output or announcement effects. Story progression, mission selection, saved progress and localization remain in their existing model. `MissionCopy` retains action/secondary-line structure inside the paper.

## Elevator-side geometry

`lib/residential-gallery.ts` previously stopped the shared exterior concrete base and horizontal rails at z=-21 while the elevator wall/lobby extends to z=-22.75, leaving a visibly unfinished 1.75 m segment. The base and two rail bars now meet the elevator wall and have a supported end segment. The shared 28F/24F/20F gallery uses the same correction. Door openings, walkable width and route logic are unchanged.

The user's uploaded screenshot could not be read because attachment access was denied (Library scope). That access was not retried or bypassed. The gap was independently reproduced in the project's actual Three.js geometry and visually compared before/after in WebGL. Do not claim direct comparison to the uploaded image.

## Verification

- 27 tests passed in the combined UI, localization, title, investigation and new railing run (`work/mission-note/tests.log`). This includes the absence of automatic objective DOM after mission/time/pause changes, explicit dialog controls and keyboard handling, all authored locale strings, handwritten paper structure and the original Korean notebook behavior.
- 4 focused actual-engine tests passed for keyboard pause controls, current mission/hint state, language switching/persistence, and the selected second-lift route (`work/mission-note/game-tests.log`). Device rendering/audio boundaries are mocked; story/input logic is real.
- Rail worker: 3 new regression tests demonstrated RED then GREEN, 5 existing geometry/threshold checks, and 5 actual V133 movement/lift integration checks passed. Three old V118/V132 integration failures reproduced with only the original rail restored in memory, with identical failures and numeric values. No source reset was used.
- Final type check passed. Scoped lint of the new mission component and changed HUD passed. Existing residential-gallery lint warnings remain outside this correction.
- Existing Sites build and itch HTML5 build passed. ZIP integrity check passed; large-bundle warnings remain from the existing game.
- Actual browser: New game → skip memory, click icon, Tab open, Escape/fold close, evidence-notebook link, repeated opening and return, and all four language variants. After E switches on the bedroom light, the current mission changes to picking up the smartphone without a center notice or upper-left mission appearing.
- 390×844: the note is readable and scrollable at normal and 150% subtitle size. Buttons and text remain inside the paper. Korean can wrap mid-word at 150%, but there was no observed clipping. This was desktop viewport emulation, not a physical-phone certification.
- User-review screenshots contain only the actual game. Korean selection and a note-open local preview are retained for review; no new public deployment was performed.

## Fonts and release

Font provenance, OFL license copies, local subsetting and complete locale glyph checks are documented in `docs/fonts/README.md` and `docs/fonts/mission-font-manifest.json`. Font source/tooling lives only in ignored work directories. Four shipped WOFF2 subsets total about 948 KiB and are used only on the note.

Latest ZIP/manifest: `outputs/homecoming-0317-html5.zip` and `.json`. It is built from base `f2ea359` plus the preserved earlier localization edits and this change; the manifest correctly records a dirty working tree. No commit, paid service, game upload or public deployment was performed in this task. The user explicitly required review and an OK before itch.io upload; that approval is pending.

Recheck the changed presentation and controls if the paper/shortcut/dialog changes, and the railing geometry/clearance if its dimensions change. The entire campaign, every device, the inaccessible original attachment, and professional translation/typography review were not validated by these checks.

## Follow-up: worn controls and visibly torn paper

The user asked for less square horror-appropriate buttons and a more aged, torn letter before approving upload. Presentation changes are in `app/game-theme.css` and `app/mission-note.css`; no mission, save, translation, or rail geometry logic changed. Native review additionally found that the HUD launcher unmounts during pause, leaving focus on the document after the note closes. `mission-note.tsx` now falls back to the newly mounted launcher when the captured element was the document body or is disconnected. Main menu/pause/ending choices now use irregular rubbed charcoal surfaces, and smaller controls use uneven worn corners. Existing button semantics and at least 44 px hit targets remain. Keyboard focus is inset on dark controls and retains a separate dark-ink style on the paper.

The note uses a stronger irregular perimeter, brown edge wear, a faded ring stain, fiber pattern and fold creases. Only its decorative layers are clipped; text and keyboard focus outlines stay intact. The four bundled handwriting families and language selection are unchanged. No remote art or font request, new dependency, or paid asset was introduced.

New verification: 18 UI/title/localization tests passed, and the button worker ran 16 overlapping title/system/investigation tests. Both CSS files parse with zero Lightning CSS warnings. Type check passed. Final Sites and itch build commands both exited successfully after the focus correction. ZIP integrity passed after Sites, since Sites cleans the shared dist directory. The earlier temporary sans-font screenshot is rejected as review evidence; final screenshots must be from the restored HTML5 build. `work/mission-note/style-tests.log`, `style-build-sites.log`, and `style-build-final.log` hold the scoped evidence.

Final follow-up ZIP: `outputs/homecoming-0317-html5.zip`, 106,217,912 bytes, SHA-256 `420919b753e0132284504d30f36e90c522af8f48314d2ffd67f17aa2e63de77c`. This supersedes previous ZIP hashes. The user reviewed the two final screenshots and explicitly requested the update. Root owns the separate itch upload handoff; this engineering task performed no public upload.

Final rendered review: actual Korean main and paper screenshots were refreshed after all handwriting fonts loaded, saved privately with the user's explicit approval, and delivered for review. Korean/English/Japanese/Chinese at 390×844 and 150% text showed no observed clipping; icon/Tab open, Escape/X/Fold close and visible keyboard focus inside the note were verified. Korean/100%/default viewport was restored. This is desktop viewport emulation of the initial mission, not full-campaign, native-speaker or physical-phone certification.

The final focus correction was verified in the actual browser: HUD icon → Escape, HUD icon → X, and Tab shortcut → Fold each closed the dialog and returned reported keyboard focus to the visible mission-note launcher.
