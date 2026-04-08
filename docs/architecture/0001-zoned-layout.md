# 0001 — Zoned DAW-style Song View layout

**Status:** accepted
**Date:** 2026-04-08
**Decision driver:** the user authored a mockup organising the Song View into three zones; we needed to commit the layout direction in code.

## Context

[`EditorSongView.jsx`](../../src/components/editor/EditorSongView.jsx) had grown to ~2,200 lines. It rendered a header, a toolbar, three vertically-stacked content lanes (waveform, sahitya, swara), a section cues row, and a seek slider — all inlined in a single component. There was no clear seam to attach future surfaces (Speed/Pitch controls, Instrument Tracks, Condensed Song Track minimap) to.

The user authored a [mockup](../assets/zoned-layout-mockup.png) reorganising the Song View into a three-zone DAW-style layout: an Audio Control Zone on top, a Song Track Zone in the middle (5 tracks), and a Bottom Bar (admin + minimap + time). Per-track Track Controls panels were drawn on the left of each track in the mockup.

Two questions had to be decided:

1. **Per-zone refactor or feature-by-feature additions?** Either we restructure the file into per-zone subcomponents up front, or we keep adding new features to the same monolith.
2. **Track Controls position: left panel (mockup-literal) or inline below the header (alternative)?**

## Decision

**Per-zone refactor, incremental.** New subcomponents land under `src/zones/{audioControlZone, songTrackZone, bottomBar}/`. Existing inlined code in `EditorSongView.jsx` is decomposed into the new tree as Phases 3–5 progress. No big-bang move. The PRD documents this in [§6](../PRD.md#6-repo-structure).

**Track Controls inline, below the header.** When the mockup was first interpreted as a literal left panel, the user pushed back and clarified: *"don't add separate track controls panel to the left, use the empty space below the headings of sound track, swara, sahitya to add controls there"*. The committed implementation places `<TrackControls>` in a small floating row directly under each track's label badge (audio tracks only — Sahitya/Swara are visual-only and have no controls row).

**Rollout: layout first, auth + publish later.** Phases 3–5 finish the layout while the app is still single-user. Phases 6–8 add Google OAuth, ownership, publish flow, admin console.

## Consequences

- Future surfaces (Speed/Pitch, Audio Mixer, Minimap, Instrument Tracks) have a clean home before they exist. The PRD points at the file path for each.
- `EditorSongView.jsx` shrinks to a thin orchestrator over Phases 3–5.
- The mockup is *not* a 1:1 spec — its left-panel `[TC]` boxes are an aspirational representation of "controls exist", not their position. The PRD calls this out explicitly so future-you doesn't get confused.
- The repo has a transitional period where some components live under `src/components/` (old) and some under `src/zones/` (new). Git history stays clean at the cost of some duplication during the transition.
- The Sound Track is the only audio-bearing track today; the Mute/Solo/Volume math in `useTrackMixer` is built to scale to multiple audio tracks for when Instrument Tracks land in Phase 4.

## Alternatives considered

- **Per-feature folders (`src/features/mute-solo/`, `src/features/calibration/`, ...).** More fashionable but blurs zone boundaries — a calibration change touches the Edit Controls cell *and* the Sound Track *and* the timing math. Per-zone is more honest about where the seams are.
- **Big-bang restructure.** Move every relevant file in one PR. Cleaner final state but the diff would be ~2,500 lines and git blame would become useless. Incremental wins.
- **Left-panel Track Controls (mockup-literal).** Eats horizontal real estate and the user explicitly chose against it. Inline below the header keeps the screen wider for the actual content.

## Updates

*(none yet)*
