# Claude Code Prompt Reference — Song Editor (EditorSongView)

Use these exact names when prompting Claude Code to change parts of the Song Editor screen. Names are stable across the Layout Spec, the Training Manual, and this file.

> Convention: `Zone-Name__WidgetName` — double underscore separates the zone from the widget. Use the full `Zone__Widget` form whenever there could be ambiguity.

---

## Zone Reference

| Zone ID | Zone Name | What it is |
|---|---|---|
| Z01 | `Top-SongInfo-Zone` | Top-left song header (back, title, raga/tala/composer, edit info, favorite) |
| Z02 | `Top-AudioControls-Zone` | Top-center audio controls (mic, pitch, tonic selector, mute) |
| Z03 | `Top-FilesMenu-Zone` | Top-right Files dropdown |
| Z04 | `Transport-Zone` | Player bar (section, loop, swara/sahitya toggle, play, time, aavartana counter) |
| Z05 | `EditorToolbar-Zone` | Tool row above the lanes (sections, trim, zoom, calibrate, lyrics, save, etc.) |
| Z06 | `Audio-Lane-Zone` | Waveform lane with timeline ruler and playhead |
| Z07 | `Sahitya-Lane-Zone` | Sahitya (lyrics) lane |
| Z08 | `Swara-Lane-Zone` | Swara (notation) lane |
| Z09 | `Bottom-Seekbar-Zone` | Bottom mini-map seekbar with section markers |

---

## Widget Reference Table

| What you want to change | Use this name in your prompt |
|---|---|
| The whole top header strip | `Top-SongInfo-Zone` |
| The back arrow | `Top-SongInfo-Zone__BackButton` |
| The song title text | `Top-SongInfo-Zone__SongTitleLabel` |
| The raga / tala / composer block | `Top-SongInfo-Zone__RagaTalaComposerMeta` |
| The Edit Info button | `Top-SongInfo-Zone__EditInfoButton` |
| The Favorite (heart) button | `Top-SongInfo-Zone__FavoriteButton` |
| The mic mute button | `Top-AudioControls-Zone__MicMuteToggle` |
| The Pitch Off pill | `Top-AudioControls-Zone__PitchOffPill` |
| The chromatic tonic selector (C–B) | `Top-AudioControls-Zone__TonicNoteSelector` |
| The speaker mute button | `Top-AudioControls-Zone__MuteSpeakerToggle` |
| The Files dropdown | `Top-FilesMenu-Zone__FilesDropdown` |
| The active section pill | `Transport-Zone__SectionSelectorPill` |
| The loop button | `Transport-Zone__LoopButton` |
| The rewind/restart button | `Transport-Zone__RewindButton` |
| The Swara/Sahitya switch | `Transport-Zone__SwaraSahityaToggle` |
| The big green play button | `Transport-Zone__PlayButton` |
| The current/total time readout | `Transport-Zone__TimeReadout` |
| The "10 / 41 AAVARTANAS" counter | `Transport-Zone__AavartanaCounter` |
| The Sections button (with badge) | `EditorToolbar-Zone__SectionsButton` |
| The Trim button | `EditorToolbar-Zone__TrimButton` |
| Zoom out / in icon buttons | `EditorToolbar-Zone__ZoomOutButton` / `EditorToolbar-Zone__ZoomInButton` |
| 1x / 2x / 5x / 10x preset pills | `EditorToolbar-Zone__ZoomPresetPills` |
| The fine-zoom slider | `EditorToolbar-Zone__ZoomSlider` |
| The Calibrate button | `EditorToolbar-Zone__CalibrateButton` |
| The calibration seconds input | `EditorToolbar-Zone__CalibrationValueInput` |
| The Undo button | `EditorToolbar-Zone__UndoButton` |
| The Lyrics button | `EditorToolbar-Zone__LyricsButton` |
| The Reset button | `EditorToolbar-Zone__ResetButton` |
| The History button | `EditorToolbar-Zone__HistoryButton` |
| The green Save button | `EditorToolbar-Zone__SaveButton` |
| The collapse arrow on a lane label | `<Lane>-Zone__LaneCollapseToggle` |
| The "AUDIO" / "SAHITYA" / "SWARA" tab badge | `<Lane>-Zone__<Lane>LaneLabel` |
| The timeline ruler above the waveform | `Audio-Lane-Zone__TimelineRuler` |
| The waveform itself | `Audio-Lane-Zone__WaveformCanvas` |
| The "0.6x" zoom badge on the waveform | `Audio-Lane-Zone__ZoomLevelBadge` |
| The vertical green playhead line | `Audio-Lane-Zone__Playhead` |
| The sahitya tokens row | `Sahitya-Lane-Zone__SahityaTokenStrip` |
| The swara tokens row | `Swara-Lane-Zone__SwaraTokenStrip` |
| The single white `\|` barlines | `Swara-Lane-Zone__BarlineMarkers` |
| The amber `\|\|` aavartana barlines | `Swara-Lane-Zone__DoubleBarlineMarkers` |
| The bottom seekbar (whole strip) | `Bottom-Seekbar-Zone` |
| The current-time label (left of seekbar) | `Bottom-Seekbar-Zone__CurrentTimeLabel` |
| The total-time label (right of seekbar) | `Bottom-Seekbar-Zone__TotalTimeLabel` |
| The orange section chips above the bar | `Bottom-Seekbar-Zone__SectionMarkerChips` |
| The seekbar track / fill | `Bottom-Seekbar-Zone__SeekbarTrack` |
| The draggable seekbar handle | `Bottom-Seekbar-Zone__SeekbarHandle` |
| The small section ticks across the bar | `Bottom-Seekbar-Zone__SectionTickMarks` |

---

## Example Claude Code Prompts

**Change styling**
> "In `Top-SongInfo-Zone`, render `RagaTalaComposerMeta` on a single line with bullet separators instead of a stacked block."

> "Make `Transport-Zone__PlayButton` 64px instead of 48px and add a subtle pulse animation while audio is playing."

**Change behavior**
> "When the user clicks `Bottom-Seekbar-Zone__SectionMarkerChips`, jump the playhead to the start of that section and pause playback."

> "In `EditorToolbar-Zone__CalibrationValueInput`, debounce changes by 300ms before re-rendering the waveform offset."

**Add a widget**
> "Add a `Top-AudioControls-Zone__DroneToggleButton` between `MuteSpeakerToggle` and `TonicNoteSelector` that turns the Tone.js drone on and off."

> "Add a `Bottom-Seekbar-Zone__PlaybackSpeedDropdown` to the right of `TotalTimeLabel` with options 0.5x, 0.75x, 1x, 1.25x."

**Change layout**
> "Stack `Sahitya-Lane-Zone` directly under `Swara-Lane-Zone` and put `Audio-Lane-Zone` at the bottom — invert the current order."

> "Make every lane's `LaneCollapseToggle` chevron 24px and move the lane label tab to the right side."

**Conditional logic / state**
> "Show `EditorToolbar-Zone__UndoButton` in disabled style (opacity 0.4, no hover) when there is no edit history; enable when at least one edit op exists."

> "Hide `Audio-Lane-Zone__ZoomLevelBadge` when zoom is exactly 1x."

> "When `Transport-Zone__SwaraSahityaToggle` is set to SAHITYA, dim `Swara-Lane-Zone__SwaraTokenStrip` to 60% opacity and vice versa."

**Cross-zone**
> "Sync the highlighted token in `Swara-Lane-Zone__SwaraTokenStrip` and `Sahitya-Lane-Zone__SahityaTokenStrip` whenever `Audio-Lane-Zone__Playhead` advances."

---

## File / Component Hints

These are likely starting points for changes. Verify with grep before editing.

| Zone / Widget | Likely file |
|---|---|
| Whole screen, top header, transport, toolbar | [src/components/editor/EditorSongView.jsx](src/components/editor/EditorSongView.jsx) |
| `Audio-Lane-Zone__WaveformCanvas`, trim handles, cut regions | [src/components/editor/WaveformEditor.jsx](src/components/editor/WaveformEditor.jsx) |
| `EditorToolbar-Zone__LyricsButton` panel content | [src/components/editor/LyricsEditor.jsx](src/components/editor/LyricsEditor.jsx) |
| `EditorToolbar-Zone__HistoryButton` slide-in sidebar | [src/components/editor/VersionHistory.jsx](src/components/editor/VersionHistory.jsx) |
| `Swara-Lane-Zone` / `Sahitya-Lane-Zone` rendering, token edit | [src/components/NotationLane.jsx](src/components/NotationLane.jsx), [src/components/LaneLabel.jsx](src/components/LaneLabel.jsx) |
| Token parsing, barlines, aavartana building | [src/utils/songParser.js](src/utils/songParser.js) |
| Audio cut/trim apply pipeline | [src/utils/audioEditor.js](src/utils/audioEditor.js) |
| WAV export from edited buffer | [src/utils/wavEncoder.js](src/utils/wavEncoder.js) |
| Backend file storage for edits | `server/songs/<uuid>/` (Express :3001) |
