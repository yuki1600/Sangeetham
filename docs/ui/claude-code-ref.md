# Claude Code Prompt Reference — Sangeetham Song View

> Use these names when prompting Claude Code (or any AI agent) to change parts of the Song View. Names are stable and match the [PRD](../PRD.md) and [layout map](layout-map.md). Always say `<Zone>__<Cell>__<Widget>` so the request is unambiguous.

---

## Zone reference

| ID | Name | Use this in prompts |
|---|---|---|
| Z1 | Audio Control Zone | `Audio-Control-Zone` |
| Z2 | Song Track Zone | `Song-Track-Zone` |
| Z3 | Bottom Bar | `Bottom-Bar` |

---

## Z1 — Audio Control Zone

| Cell | Use this in prompts |
|---|---|
| Song Info (back, title, raga, tala, composer, edit info, favorite) | `Audio-Control-Zone__Song-Info` |
| Transport Controls (loop, restart, swara/sahitya audio toggle, play/pause, time, āvartana counter) | `Audio-Control-Zone__Transport-Controls` |
| Speed/Pitch Controls (Phase 4) | `Audio-Control-Zone__Speed-Pitch-Controls` |
| Edit Controls (sections, trim, calibrate, lyrics, save, etc.) | `Audio-Control-Zone__Edit-Controls` |
| Audio Controls — master volume, drone, mic monitor (Phase 4) | `Audio-Control-Zone__Audio-Controls` |
| Composer Info | `Audio-Control-Zone__Composer-Info` |

### Cell widgets

| Widget | Use this in prompts |
|---|---|
| Back arrow | `Audio-Control-Zone__Song-Info__BackButton` |
| Song title | `Audio-Control-Zone__Song-Info__SongTitleLabel` |
| Raga / tala pills | `Audio-Control-Zone__Song-Info__RagaTalaMetaPills` |
| Composer label | `Audio-Control-Zone__Song-Info__ComposerMetaLabel` |
| Edit Info button | `Audio-Control-Zone__Song-Info__EditInfoButton` |
| Favorite (heart) toggle | `Audio-Control-Zone__Song-Info__FavoriteButton` |
| Section badge (current section) | `Audio-Control-Zone__Transport-Controls__SectionBadge` |
| Loop toggle | `Audio-Control-Zone__Transport-Controls__LoopToggleButton` |
| Restart button | `Audio-Control-Zone__Transport-Controls__RestartButton` |
| Swara / Sahitya audio toggle | `Audio-Control-Zone__Transport-Controls__SwaraSahityaAudioToggle` |
| Play / pause button | `Audio-Control-Zone__Transport-Controls__PlayPauseButton` |
| Time readout (`MM:SS / MM:SS`) | `Audio-Control-Zone__Transport-Controls__TimeReadout` |
| Āvartana counter | `Audio-Control-Zone__Transport-Controls__AavartanaCounter` |
| Sections button | `Audio-Control-Zone__Edit-Controls__SectionsButton` |
| Trim button | `Audio-Control-Zone__Edit-Controls__TrimButton` |
| Zoom out / in buttons | `Audio-Control-Zone__Edit-Controls__ZoomOutButton` / `__ZoomInButton` |
| Zoom preset pills (1×/2×/5×/10×) | `Audio-Control-Zone__Edit-Controls__ZoomPresetPills` |
| Zoom slider | `Audio-Control-Zone__Edit-Controls__ZoomSlider` |
| Calibrate button | `Audio-Control-Zone__Edit-Controls__CalibrateButton` |
| Calibration seconds input | `Audio-Control-Zone__Edit-Controls__CalibrationValueInput` |
| Undo button | `Audio-Control-Zone__Edit-Controls__UndoButton` |
| Lyrics button | `Audio-Control-Zone__Edit-Controls__LyricsButton` |
| History button | `Audio-Control-Zone__Edit-Controls__HistoryButton` |
| Save button | `Audio-Control-Zone__Edit-Controls__SaveButton` |
| Composer arohana/avarohana display | `Audio-Control-Zone__Composer-Info__ComposerArohanaAvarohanaDisplay` |
| Files dropdown (header today, relocates Phase 3) | `Audio-Control-Zone__Files-Dropdown` |

---

## Z2 — Song Track Zone

### Tracks

| Track | Use this in prompts |
|---|---|
| Sound Track | `Song-Track-Zone__Sound-Track` |
| Sahitya Track | `Song-Track-Zone__Sahitya-Track` |
| Swara Track | `Song-Track-Zone__Swara-Track` |
| Instrument Track 1 — Tala (Phase 4) | `Song-Track-Zone__Instrument-Track-1` |
| Instrument Track 2 — Tambura (Phase 4) | `Song-Track-Zone__Instrument-Track-2` |

### Per-track widgets (every track has these — substitute the track name)

| Widget | Pattern |
|---|---|
| Visibility toggle (label badge, click to collapse/expand) | `Song-Track-Zone__<Track>__VisibilityToggleButton` |
| Track Controls row (audio/synth tracks only) | `Song-Track-Zone__<Track>__TrackControls` |
| Mute button (inside Track Controls) | `Song-Track-Zone__<Track>__TrackControls__MuteButton` |
| Solo button | `Song-Track-Zone__<Track>__TrackControls__SoloButton` |
| Volume slider | `Song-Track-Zone__<Track>__TrackControls__VolumeSlider` |
| Bottom-edge resize handle | `Song-Track-Zone__<Track>__ResizeHandle` |
| Track content (waveform / notation / synth viz) | `Song-Track-Zone__<Track>__Content` |

> **Sahitya Track and Swara Track are visual-only.** They have NO `TrackControls` row (no mute/solo/volume). Only the visibility toggle and the resize handle. Don't ask for `Song-Track-Zone__Sahitya-Track__TrackControls` — it doesn't exist.

### Cross-track widgets (rendered once at the zone level)

| Widget | Use this in prompts |
|---|---|
| Āvartana boundary lines (golden vertical strips spanning all tracks) | `Song-Track-Zone__AvartanaBoundaryOverlay` |
| Playhead (vertical green line at 12.5% of zone width) | `Song-Track-Zone__Playhead` |
| Loop range overlay (translucent rectangle when looping) | `Song-Track-Zone__LoopRangeOverlay` |
| Trim selection popup (Sound Track only, in trim mode) | `Song-Track-Zone__TrimSelectionPopup` |

---

## Z3 — Bottom Bar

| Cell | Use this in prompts |
|---|---|
| Admin Controls (Reset + Files; Phase 3 relocation pending) | `Bottom-Bar__Admin-Controls` |
| Condensed Song Track minimap (Phase 4) | `Bottom-Bar__Condensed-Song-Track` |
| Time Controls (seek bar + time readout) | `Bottom-Bar__Time-Controls` |

### Admin Controls widgets

| Widget | Use this in prompts |
|---|---|
| Reset button | `Bottom-Bar__Admin-Controls__ResetButton` |
| Files dropdown | `Bottom-Bar__Admin-Controls__FilesButton` |

### Time Controls widgets

| Widget | Use this in prompts |
|---|---|
| Current time label | `Bottom-Bar__Time-Controls__CurrentTimeLabel` |
| Total time label | `Bottom-Bar__Time-Controls__TotalTimeLabel` |
| Seek track / fill bar | `Bottom-Bar__Time-Controls__SeekTrack` |
| Draggable seek handle | `Bottom-Bar__Time-Controls__SeekHandle` |
| Āvartana tick marks | `Bottom-Bar__Time-Controls__AavartanaTickMarks` |
| Section marker bands (amber tiled labels above the track) | `Bottom-Bar__Time-Controls__SectionMarkerBands` |

### Condensed Song Track widgets *(Phase 4)*

| Widget | Use this in prompts |
|---|---|
| Waveform peaks | `Bottom-Bar__Condensed-Song-Track__WaveformPeaks` |
| Section bands overlay | `Bottom-Bar__Condensed-Song-Track__SectionBands` |
| Viewport indicator | `Bottom-Bar__Condensed-Song-Track__ViewportIndicator` |

---

## Example prompts

### Change styling
> "In `Audio-Control-Zone__Song-Info`, render `RagaTalaMetaPills` on a single line with bullet separators."
>
> "Make `Audio-Control-Zone__Transport-Controls__PlayPauseButton` 64px instead of 48px and add a subtle pulse animation while playing."

### Change behaviour
> "When the user clicks `Bottom-Bar__Time-Controls__SectionMarkerBands`, jump the playhead to that section's start AND pause playback."
>
> "In `Song-Track-Zone__Sound-Track__TrackControls__VolumeSlider`, debounce changes by 50ms before re-applying gain so very fast drags don't thrash."

### Add a widget
> "Add an `Audio-Control-Zone__Audio-Controls__DroneToggleButton` between the master volume slider and the mic monitor toggle."
>
> "Add a `Bottom-Bar__Time-Controls__PlaybackSpeedDropdown` to the right of `TotalTimeLabel` with options 0.5×, 0.75×, 1×, 1.25×."

### Conditional logic
> "Show `Audio-Control-Zone__Edit-Controls__UndoButton` in disabled style (opacity 0.4, no hover) when the edit history is empty."
>
> "When `Audio-Control-Zone__Transport-Controls__SwaraSahityaAudioToggle` is set to SAHITYA, dim `Song-Track-Zone__Swara-Track__Content` to 60% opacity."

### Cross-zone
> "Sync `Song-Track-Zone__Playhead` with `Bottom-Bar__Condensed-Song-Track__ViewportIndicator` so dragging either one updates both immediately."

### Layout
> "Stack `Song-Track-Zone__Sahitya-Track` directly under `Song-Track-Zone__Swara-Track` (swap their vertical order)."

---

## File / component hints

These are likely starting points. **Always grep before editing** — Phase 3 is in progress and ownership is moving.

| Zone / Cell / Widget | Likely file (today) | Target file (after Phase 3) |
|---|---|---|
| Whole Song View component (orchestrator) | [`src/components/editor/EditorSongView.jsx`](../../src/components/editor/EditorSongView.jsx) | unchanged (becomes thin orchestrator) |
| `Audio-Control-Zone__*` (header, transport, edit toolbar) | inlined in `EditorSongView.jsx` lines ~920–1560 | `src/zones/audioControlZone/{AudioControlZone, SongInfoPanel, TransportControls, EditControls, ComposerInfoPanel, SpeedPitchControls, AudioMixerControls}.jsx` |
| `Song-Track-Zone__Sound-Track` waveform | [`src/components/editor/WaveformEditor.jsx`](../../src/components/editor/WaveformEditor.jsx) (rendered) | wrapped by `src/zones/songTrackZone/tracks/SoundTrack.jsx` |
| `Song-Track-Zone__Sahitya-Track` / `__Swara-Track` notation | [`src/components/NotationLane.jsx`](../../src/components/NotationLane.jsx) (rendered) | wrapped by `src/zones/songTrackZone/tracks/{SahityaTrack, SwaraTrack}.jsx` |
| `Song-Track-Zone__<Track>__TrackControls` | [`src/components/songview/TrackControls.jsx`](../../src/components/songview/TrackControls.jsx) | `src/zones/songTrackZone/TrackControls.jsx` |
| `Song-Track-Zone__<Track>__ResizeHandle` | [`src/components/songview/TrackResizeHandle.jsx`](../../src/components/songview/TrackResizeHandle.jsx) | `src/zones/songTrackZone/TrackResizeHandle.jsx` |
| Per-track state (`muted`/`solo`/`volume`/`visible`/`heightPx`) | [`src/hooks/useTrackMixer.js`](../../src/hooks/useTrackMixer.js) | unchanged |
| Wheel pan + drag seek wiring | [`src/hooks/useWheelZoom.js`](../../src/hooks/useWheelZoom.js), [`src/hooks/useDragSeek.js`](../../src/hooks/useDragSeek.js) | unchanged |
| `Song-Track-Zone__AvartanaBoundaryOverlay` | [`src/components/AvartanaBoundaryOverlay.jsx`](../../src/components/AvartanaBoundaryOverlay.jsx) | unchanged |
| `Bottom-Bar__Time-Controls` (seek bar) | inlined in `EditorSongView.jsx` lines ~1750–1950 | `src/zones/bottomBar/TimeControls.jsx` |
| `Bottom-Bar__Admin-Controls__ResetButton` | inlined in `EditorSongView.jsx` (Edit Controls toolbar) | `src/zones/bottomBar/AdminControls.jsx` after relocation |
| `Bottom-Bar__Admin-Controls__FilesButton` | inlined in `EditorSongView.jsx` (header) | `src/zones/bottomBar/AdminControls.jsx` after relocation |
| Token parsing, barlines, āvartana building | [`src/utils/songParser.js`](../../src/utils/songParser.js) | unchanged |
| Audio cut/trim apply pipeline | [`src/utils/audioEditor.js`](../../src/utils/audioEditor.js) | unchanged |
| WAV export | [`src/utils/wavEncoder.js`](../../src/utils/wavEncoder.js) | unchanged |

---

## Naming rules

- **Zones, cells, widgets** are kebab-case with `__` between levels: `Audio-Control-Zone__Edit-Controls__SaveButton`.
- **Widget names** are PascalCase at the leaf so they read like component names: `SaveButton`, `VolumeSlider`, `SectionMarkerBands`.
- When you mean a whole zone, drop the trailing `__`: `Song-Track-Zone`, not `Song-Track-Zone__`.
- When a widget is repeated per track, use `<Track>` as a placeholder in this doc: `Song-Track-Zone__<Track>__TrackControls`. In a real prompt, substitute the actual track: `Song-Track-Zone__Sound-Track__TrackControls`.
