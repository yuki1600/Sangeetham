# Layout Map — Sangeetham Song View

> **This is the implementation-level companion to [`docs/PRD.md`](../PRD.md).** The PRD is the *what and why*; this file is the *what's actually rendered right now and what the parts are called*. Update this file whenever the rendered tree changes.

The Song View (single component, mounted by `song-view/:id` and `editor-song/:id`) is divided into three top-level zones that match the [user mockup](../assets/zoned-layout-mockup.png):

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIO CONTROL ZONE                       │  Z1
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    SONG TRACK ZONE                          │  Z2
│                    (5 vertical tracks)                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                       BOTTOM BAR                            │  Z3
└─────────────────────────────────────────────────────────────┘
```

Each zone has named cells. When prompting changes, refer to cells by `<ZoneName>__<CellName>` so the request is unambiguous.

---

## Zone summary

| ID | Zone | Purpose | PRD § |
|---|---|---|---|
| Z1 | **Audio Control Zone** | Song header, transport, edit toolbar, master mix, composer info | [§2.1](../PRD.md#21-audio-control-zone) |
| Z2 | **Song Track Zone** | 5 vertically stacked tracks: Sound, Sahitya, Swara, Instrument 1, Instrument 2 | [§2.2](../PRD.md#22-song-track-zone) |
| Z3 | **Bottom Bar** | Admin controls, condensed song track minimap, time controls | [§2.3](../PRD.md#23-bottom-bar) |

---

## Z1 — Audio Control Zone

Top zone. Six cells in a 4-column / 2-row grid (Song Info and Composer Info span both rows on the outside; the four inner cells stack 2×2 in the middle).

```
┌─────────┬─────────────────┬───────────────────┬───────────┐
│  Song   │ Transport Ctrls │ Speed/Pitch Ctrls │ Composer  │
│  Info   ├─────────────────┼───────────────────┤ Info      │
│         │ Edit Controls   │ Audio Controls    │           │
└─────────┴─────────────────┴───────────────────┴───────────┘
```

| Cell | Status | Owner file (target after Phase 3) | Currently |
|---|---|---|---|
| `Audio-Control-Zone__Song-Info` | shipped | `src/zones/audioControlZone/SongInfoPanel.jsx` | inlined in `EditorSongView.jsx` ~line 945 |
| `Audio-Control-Zone__Transport-Controls` | shipped | `src/zones/audioControlZone/TransportControls.jsx` | inlined ~line 1180 |
| `Audio-Control-Zone__Speed-Pitch-Controls` | **Phase 4** (not built) | `src/zones/audioControlZone/SpeedPitchControls.jsx` | — |
| `Audio-Control-Zone__Edit-Controls` | shipped | `src/zones/audioControlZone/EditControls.jsx` | inlined ~line 1290 |
| `Audio-Control-Zone__Audio-Controls` | **Phase 4** (not built) | `src/zones/audioControlZone/AudioMixerControls.jsx` | — |
| `Audio-Control-Zone__Composer-Info` | shipped | `src/zones/audioControlZone/ComposerInfoPanel.jsx` | inlined ~line 970 |

### Cell contents (currently rendered)

#### `Song-Info`
- `BackButton` — round button with left arrow, returns to wherever you came from
- `SongTitleLabel` — composition title (truncates with ellipsis)
- `RagaTalaMetaPills` — `RAGA: <name>` (emerald), `TALA: <name>` (blue)
- `ComposerMetaLabel` — `COMPOSER: <name>` (amber), shown only if not "Unknown"
- `EditInfoButton` — opens metadata edit modal
- `FavoriteButton` — heart toggle, persists to `songs.isFavorite`

#### `Transport-Controls`
- `SectionBadge` — pill showing current section name (auto-detected from playhead)
- `LoopToggleButton` — toggles A/B loop selection mode
- `RestartButton` — returns playhead to 0 (or loop start if looping)
- `SwaraSahityaAudioToggle` — picks which audio source plays (`SWARA` | `SAHITYA`)
- `PlayPauseButton` — primary play/pause action
- `TimeReadout` — `MM:SS / MM:SS` current/total
- `AavartanaCounter` — `<current> / <total> AAVARTANAS`

#### `Edit-Controls` (currently shown as the "edit toolbar" row)
- `SectionsButton` — opens the Section Cues panel
- `TrimButton` — enters trim mode on the Sound Track
- `ZoomControls` — `ZoomOutButton`, `ZoomPresetPills` (1x/2x/5x/10x), `ZoomInButton`, `ZoomSlider`
- `CalibrateButton` — enters calibrate mode
- `CalibrationValueInput` — numeric seconds input for the āvartana duration
- `UndoButton` — pops the last edit op
- `LyricsButton` — opens the Lyrics modal
- `ResetButton` — wipes all edit ops *(scheduled to relocate to `Bottom-Bar__Admin-Controls` in Phase 3)*
- `HistoryButton` — opens the Version History sidebar
- `SaveButton` — primary save action

#### `Composer-Info`
- `ComposerArohanaAvarohanaDisplay` — Aro: `S R G M P D N S'`, Avaro: `S' N D P M G R S` rendered as colored swara pills

#### `Speed-Pitch-Controls` *(Phase 4 — not yet rendered)*
- `TempoSlider` — 0.5×–1.5× via `HTMLAudioElement.playbackRate`
- `PitchShiftSlider` — ±6 semitones via `Tone.PitchShift` on the master bus

#### `Audio-Controls` *(Phase 4 — not yet rendered)*
- `MasterVolumeSlider`
- `DroneToggleButton` + `DroneTonicPicker`
- `MicMonitorToggle`

### Files menu (currently in the header, scheduled to relocate)

The `Files` dropdown lives in the top-right of the header today. In Phase 3 it relocates to `Bottom-Bar__Admin-Controls` along with `Reset`. While it's still in the header it's named:

- `Audio-Control-Zone__Files-Dropdown` — opens menu with: View PDF, Original JSON, Edited JSON, Original Audio, Edited Audio (.mp3), Swap Swara Audio, Swap Sahitya Audio, Swap JSON Composition

---

## Z2 — Song Track Zone

Middle zone. Five vertically stacked tracks, each with the same shape: a clickable header (visibility toggle) at top-left, optional Track Controls row directly underneath, the track-specific content (waveform / notation / synth viz) filling the rest, and a bottom-edge resize handle.

```
┌──────────────────────────────────────────────────────┐
│ ▽ SOUND TRACK                                        │
│ [⊘] [🎧] [▱▱▱]   ~~~ waveform fills the rest ~~~     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ← resize handle
├──────────────────────────────────────────────────────┤
│ ▽ SAHITYA TRACK                                      │
│              ~~~ scrolling lyrics ~~~                │
├──────────────────────────────────────────────────────┤
│ ▽ SWARA TRACK                                        │
│              ~~~ scrolling notation ~~~              │
├──────────────────────────────────────────────────────┤
│ ▽ INSTRUMENT TRACK 1 (Tala)         [Phase 4]        │
├──────────────────────────────────────────────────────┤
│ ▽ INSTRUMENT TRACK 2 (Tambura)      [Phase 4]        │
└──────────────────────────────────────────────────────┘
```

| Cell | Status | Owner file (target) | Kind |
|---|---|---|---|
| `Song-Track-Zone__Sound-Track` | shipped | `src/zones/songTrackZone/tracks/SoundTrack.jsx` | audio |
| `Song-Track-Zone__Sahitya-Track` | shipped | `src/zones/songTrackZone/tracks/SahityaTrack.jsx` | visual |
| `Song-Track-Zone__Swara-Track` | shipped | `src/zones/songTrackZone/tracks/SwaraTrack.jsx` | visual |
| `Song-Track-Zone__Instrument-Track-1` | **Phase 4** | `src/zones/songTrackZone/tracks/InstrumentTrack.jsx` (Tala synth) | synth |
| `Song-Track-Zone__Instrument-Track-2` | **Phase 4** | `src/zones/songTrackZone/tracks/InstrumentTrack.jsx` (Tambura) | synth |

### Per-track widgets (each track has these)

- `<Track>__VisibilityToggleButton` — clickable label badge at `top: 6, ml: 4`. Click to collapse to 36px / expand to `heightPx`.
- `<Track>__TrackControls` — **audio/synth tracks only**. Inline horizontal row directly below the label. Contains:
  - `MuteButton` — toggles `state.muted`
  - `SoloButton` — toggles `state.solo`
  - `VolumeSlider` — sets `state.volume` (0..1)
- `<Track>__ResizeHandle` — bottom edge, drag to resize `state.heightPx`
- `<Track>__Content` — track-specific:
  - Sound Track → `<WaveformEditor>` (`src/components/editor/WaveformEditor.jsx`)
  - Sahitya / Swara Track → `<NotationLane>` (`src/components/NotationLane.jsx`)
  - Instrument tracks → TBD Phase 4

> **Note:** Sahitya and Swara tracks are **visual-only** — they render notation but don't produce audio. They have NO `TrackControls` row (no mute/solo/volume). Only the visibility toggle and resize handle.

### Cross-track widgets (rendered once at the zone level)

- `Song-Track-Zone__AvartanaBoundaryOverlay` — golden vertical lines at every āvartana boundary, spans all tracks. Component: `src/components/AvartanaBoundaryOverlay.jsx`.
- `Song-Track-Zone__Playhead` — fixed at 12.5% from the left edge of the zone (`PLAYHEAD` constant). Time scrolls left under it.
- `Song-Track-Zone__LoopRangeOverlay` — translucent rectangle showing the active loop range, when looping is enabled.
- `Song-Track-Zone__TrimSelectionPopup` — appears on the Sound Track when the user selects a region in trim mode; contains the Delete button.

### Cross-track behaviour

- **Wheel/swipe pan** — wired once on the zone's `<main>` element via `useWheelZoom`. Two-finger horizontal swipes pan the playhead from anywhere in the zone.
- **Drag-to-seek / drag-to-loop** — wired on the same `<main>` via `useDragSeek`.
- **State** — all per-track config (`muted`, `solo`, `volume`, `visible`, `heightPx`) lives in `useTrackMixer` ([`src/hooks/useTrackMixer.js`](../../src/hooks/useTrackMixer.js)).

---

## Z3 — Bottom Bar

Bottom zone. Three cells horizontally: Admin Controls (left) | Condensed Song Track (middle) | Time Controls (right).

```
┌────────────────┬─────────────────────────────────┬──────────────────┐
│ Admin Controls │ Condensed Song Track            │ Time Controls    │
│  Reset  Files  │ ~~~minimap~~~  [    viewport ]  │ 02:11 / 10:59    │
└────────────────┴─────────────────────────────────┴──────────────────┘
```

| Cell | Status | Owner file (target) |
|---|---|---|
| `Bottom-Bar__Admin-Controls` | **Phase 3** (will hold Reset + Files relocated from header/toolbar) | `src/zones/bottomBar/AdminControls.jsx` |
| `Bottom-Bar__Condensed-Song-Track` | **Phase 4** (not built) | `src/zones/bottomBar/MinimapTrack.jsx` |
| `Bottom-Bar__Time-Controls` | shipped (currently the seek slider, lines ~1750–1950 of `EditorSongView.jsx`) | `src/zones/bottomBar/TimeControls.jsx` |

### `Time-Controls` widgets (currently rendered)

- `Bottom-Bar__Time-Controls__CurrentTimeLabel` — left side, `MM:SS`
- `Bottom-Bar__Time-Controls__TotalTimeLabel` — right side, `MM:SS`
- `Bottom-Bar__Time-Controls__SeekTrack` — horizontal track with filled portion to current time
- `Bottom-Bar__Time-Controls__SeekHandle` — round draggable thumb
- `Bottom-Bar__Time-Controls__AavartanaTickMarks` — vertical ticks at every āvartana
- `Bottom-Bar__Time-Controls__SectionMarkerBands` — amber tiled bands above the seek track, one per section, spanning each section's `[start, end]` range. Click to jump to section start. The currently-active section is highlighted.

### `Admin-Controls` widgets *(Phase 3 — relocation pending)*

- `Bottom-Bar__Admin-Controls__ResetButton` — currently in `Edit-Controls`, scheduled to relocate
- `Bottom-Bar__Admin-Controls__FilesButton` — currently in the header, scheduled to relocate. Opens dropdown with download/swap actions.

### `Condensed-Song-Track` widgets *(Phase 4 — not yet built)*

- `Bottom-Bar__Condensed-Song-Track__WaveformPeaks` — full-song waveform compressed to fit the cell width
- `Bottom-Bar__Condensed-Song-Track__SectionBands` — semi-transparent overlays showing each section's range
- `Bottom-Bar__Condensed-Song-Track__ViewportIndicator` — translucent rectangle showing what's currently visible in the Sound Track. Drag to scrub.
- Click anywhere on the cell → seek the playhead.

---

## What's deliberately not in this map

- The **Edit Info modal** (`Audio-Control-Zone__Song-Info__EditInfoButton` opens it) — modal, not part of the zoned layout.
- The **Section Cues panel** (opens via `Edit-Controls__SectionsButton`) — drawer that slides down below the toolbar.
- The **Lyrics modal** (opens via `Edit-Controls__LyricsButton`) — full-screen modal.
- The **Version History sidebar** (opens via `Edit-Controls__HistoryButton`) — slide-in right sidebar.
- The **Missing Audio Upload modal** — appears when the user toggles to a sahitya/swara source that has no audio uploaded yet.

These are all rendered at the top level of the Song View component (next to the zone tree, not inside any zone) and have their own files / modules. They're documented in the relevant flow docs.

---

## Out of date? Update this file.

If you're touching the rendered tree of the Song View, update the matching cell here in the same commit. The naming reference in [`claude-code-ref.md`](claude-code-ref.md) should also be updated whenever a widget is added, removed, or renamed.
