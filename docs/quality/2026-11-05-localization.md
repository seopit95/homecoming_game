# 2026-11-05 · Four-language text settings

## Change

English is the default for new and old settings that do not contain a language. The existing title and pause settings offer English, 한국어, 日本語 and 简体中文. Selection is saved in the existing browser settings record and changes visible text immediately without restarting, changing progress, skipping evidence or resetting the current scene.

`lib/i18n.ts` and `lib/locales/*.json` contain 1,276 Korean source strings with complete English, Japanese and Simplified Chinese translations. Scope includes menus, controls, status/error text, missions, subtitles, notebook evidence, the full wife's letter, endings, credits, interaction labels, procedural signs, smartphone and CCTV text. Native language names are intentionally preserved. Existing recorded voices and sound effects are not dubbed.

React presentation localization leaves callbacks, refs, model IDs and saved evidence untouched. Mission/message translation happens before custom control-key substitution. Canvas text uses a small replayable overlay per text canvas and redraws existing textures on language change, including paused screens. Texture references are weak, and unchanged full backgrounds are not regenerated. Long binder and carton labels have explicit label-width limits.

## Verified

- `tests/localization.test.mjs`: 8 passing tests. Defaults, invalid locale fallback, settings roundtrip and blocked storage, all catalog values/placeholders/newlines, unknown-text recursion regression, native options, all story objectives and earned notebook records, actual TSX title/mission/pause/notebook rendering, immediate canvas redraw/texture invalidation, exhaustive authored runtime-string coverage.
- `title-screen`, `system-ui`, `investigation`, `smartphone`: 18 passing tests. Existing Korean UI assertions now select the supported Korean context explicitly.
- `game.test.mjs`, focused pattern `language settings update|V123 the bedside smartphone|V140 current mission|room streaming keeps|V142 postal investigation`: 5 passing real-engine tests with mocked device boundaries. Language changes while paused preserve story, elapsed time and evidence, save the locale, and immediately update the mission.
- `tsc --noEmit --incremental false`: passed on final product code.
- `oxlint lib/i18n.ts lib/localized-canvas.ts app/localization.tsx`: passed. This is scoped lint, not a claim that the legacy project's global lint is clean.
- Both `npm run build` (existing Sites target) and `npm run build:itch`: passed. Existing large-bundle warnings remain.
- `unzip -t`: all entries passed. ZIP has root `index.html`, 161 files, 116,985,766 extracted bytes.
- Actual local browser: English initial title, all four native options, immediate switching, Chinese persistence after reload, Back to title, New game, Skip memory, pause/resume, Japanese HUD/objective/room/notebook, Korean/Chinese/English game-objective switching. At 390×844, pause settings remain scrollable and usable without observed horizontal clipping. A Japanese notebook sidebar heading was reduced to avoid an orphaned final character.

Detailed local evidence: `work/localization/` (ignored). `tests-final.log` contains the 25-test combined run before adding the final static-coverage test; `tests-localization.log` contains all 8 localization tests; `game-final.log` contains the 5 engine tests. Build logs and baseline logs are in the same folder.

## Existing failures, checked against the original source

A broader 47-test sweep had 33 passes and 14 failures. All 14 failure names and error payloads were reproduced against isolated clean HEAD `f2ea359` using `git archive`, without altering this working tree:

- Two old apartment-signage assertions (evacuation-board wording and rear backing).
- One old progress normalization expectation (resident route now normalizes to annex).
- Eight old sign-support/fixture assertions for landing, lift, corridor, stairs, resident, annex, courtyard and parking, plus one landing-floor readability assertion.
- Two surveillance assertions (old road movement and same-frame pause icon).

These are not localization regressions. No geometry, route or surveillance timing fixes were attempted in this text-language task.

## Release artifact and limits

Final product ZIP: `outputs/homecoming-0317-html5.zip`, 105,235,466 bytes.
SHA-256: `86f77570c5efb1760aa81c774572400c993fffe3f5f0518cc00cddc651d26e3d`.
Manifest: `outputs/homecoming-0317-html5.json`.

Base source is `f2ea3595b34dd94b2487dcdd595a8b5b704d8523` plus these uncommitted requested edits. The manifest accurately says `sourceDirty: true`; it is not the old uploaded ZIP. No publication, upload, paid service, new dependency or voice production was performed here. The existing itch.io draft is left for the parent workflow to update.

This validates the changed language flows, not a complete replay of every campaign path, native-device testing, every monitor's text legibility, or professional native-speaker certification of all three translations. Original Korean is preserved as the source language. Recheck localization and the affected presentation flow whenever copy, language storage, canvas drawing, or UI layout changes.
