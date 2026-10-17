# Investigation narrative implementation plan

> For agentic workers: use executing-plans for this single, bounded implementation.

**Goal:** Make the existing story intelligible from earned evidence, with no premature revelations and no automatic pause.
**Architecture:** Derive one read-only notebook from existing saved notes. A React component presents its event timeline, questions and complete source documents. The game simulation and save schema retain their existing behavior.
**Tech Stack:** Existing React, TypeScript and CSS; no new packages.
**Spec:** This document, Design below.

## Global constraints
- Full horror-game quality objective remains active and incomplete.
- Reuse unchanged accepted evidence; the user forbids duplicate verification.
- No guessed overall completion percentage or unmeasured30–40minute claim.
- Sites helper owns commit/build/package; no manual Git mutation.
- Notebook conclusions depend on earned notes, never on an unexamined tape or a circuit flag that is cleared after leaving the archive.
- Only an explicit player action opens the notebook and pauses the game.

## Design
The notebook separates03:16 voice,03:17 collision,03:20 call and03:26 entry. Recovered media and compared facts use different captions. Three compared originals reveal the repeated refusal to help. The resident's identity and ordinary life appear only from found records. Unanswered questions mention only already encountered gaps. Documents are grouped by discovered location; no future locations or answers are exposed. All existing full text remains available, including notes from older saves. The count includes actual journal entries once each.

Desktop uses a timeline beside expandable source records. Narrow screens use a single column. The outer pause card fits the viewport and Continue remains accessible. Desktop comparison columns scroll independently with keyboard-focusable regions; portrait mobile uses one notebook scroll pane. On short landscape screens the whole card scrolls instead, keeping both the top close action and bottom Continue reachable. J opens and closes the notebook; held-key repeat does not toggle it repeatedly. HUD and notebook use the same earned-record count.

## Task1: Read earned evidence
- [x] Add tests/investigation.test.mjs before implementation; observe missing-module RED.
- [x] Add lib/investigation.ts with investigation(story: Pick<Story,'notes'>).
- [x] Verify no premature confession, preserved raw documents, circuit-independent conclusions, event order, no leaked safe answer/ending.
- [x] Reproduce an unplayed-call dialogue leak; correct the raw-only title/body and pass all3tests.
- [x] Reproduce the review's raw-only gate-tape leak; separate tape-label knowledge from an actually observed office next frame, preserving confirmed findings.

Run: node --experimental-strip-types --test tests/investigation.test.mjs

## Task2: Present and navigate
- [x] Add app/investigation-notebook.tsx and its CSS; replace only the old journal body in app/page.tsx.
- [x] Keep settings and manual pause semantics; J toggles the notebook.
- [x] Check TypeScript.
- [x] Observe actual partial/confirmed earned-state menus, manual pause/resume, unchanged notes/circuits, retained original message and mobile horizontal fit.
- [x] Correct the observed nested mobile scrolling through a constrained flex pause card.
- [x] Inspect changed final desktop/mobile layout using retained native Chrome fixtures.
- [x] Correct the review's short-height clipping and observe both resume controls working at844×390; retain portrait single-pane scrolling at390×844 and matching HUD/notebook counts. Correct the QA locator to the existing accessible label after its initial mismatch; no application change for that locator.

## Release procedure
1. Obtain one scoped read-only review of final source/evidence.
2. Run remaining final TypeScript and build/package once through the native Sites helper.
3. Validate exact reviewed source against packaged commit/archive, then publish.

This milestone improves narrative access and causality. Whole plot/gameplay density, final art, novice play duration and device performance remain open.
