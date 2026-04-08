# Layout Map — Song Editor (EditorSongView)

**Source screenshot:** Song Editor view at `/#editor-song/<uuid>`, song "Mate Malaya Dvaja" (Khamas / Adi / Mysore Vasudevacharya), playhead at 2:11 / 10:59, Sahitya tab active, Calibrate mode engaged.

---

## Segment Map

| Zone ID | Zone Name | Widgets | Layout | Confirmed / Inferred |
|---|---|---|---|---|
| Z01 | Top-SongInfo-Zone | BackButton, SongTitleLabel, RagaTalaComposerMeta, EditInfoButton, FavoriteButton | Fixed top-left cluster | Confirmed |
| Z02 | Top-AudioControls-Zone | MicMuteToggle, PitchOffPill, TonicNoteSelector (C–B), MuteSpeakerToggle | Centered horizontal cluster | Confirmed |
| Z03 | Top-FilesMenu-Zone | FilesDropdown | Top-right corner | Confirmed |
| Z04 | Transport-Zone | SectionSelectorPill, LoopButton, RewindButton, SwaraSahityaToggle, PlayButton, TimeReadout, AavartanaCounter | Horizontal row, second band | Confirmed |
| Z05 | EditorToolbar-Zone | SectionsButton, TrimButton, ZoomOutButton, ZoomPresetPills (1x/2x/5x/10x), ZoomInButton, ZoomSlider, CalibrateButton, CalibrationValueInput, UndoButton, LyricsButton, ResetButton, HistoryButton, SaveButton | Horizontal toolbar above lanes | Confirmed |
| Z06 | Audio-Lane-Zone | LaneCollapseToggle, AudioLaneLabel, TimelineRuler, WaveformCanvas, ZoomLevelBadge, Playhead | Top lane in stack | Confirmed |
| Z07 | Sahitya-Lane-Zone | LaneCollapseToggle, SahityaLaneLabel, SahityaTokenStrip | Middle lane | Confirmed |
| Z08 | Swara-Lane-Zone | LaneCollapseToggle, SwaraLaneLabel, SwaraTokenStrip, BarlineMarkers, DoubleBarlineMarkers | Bottom lane | Confirmed |
| Z09 | Bottom-Seekbar-Zone | CurrentTimeLabel, TotalTimeLabel, SectionMarkerChips (Pallavi, Anupallavi…), SeekbarTrack, SeekbarHandle, SectionTickMarks | Fixed bottom mini-map | Confirmed |

> **Cross-zone widget:** `Audio-Lane-Zone__Playhead` is a single vertical green line that visually overlays Z06 → Z08 to indicate the current play position. It is anchored to the lane stack but addressable via the Audio lane it belongs to.

---

## Artifact 1 — Layout Spec (PRD / Design)

### Screen: Song Editor (S01)

- **Purpose:** Edit a Carnatic composition's audio (trim, calibrate, cut), notation (swara/sahitya tokens), and metadata, with synchronized karaoke-style playback.
- **Platform:** Web (React 19 + Vite, dark/light theme)
- **Navigation Entry:** From Song Browser → click song row → opens at `/#editor-song/<uuid>`

---

### Z01 — Top-SongInfo-Zone

- **Position:** Fixed top, left cluster
- **Widgets:**
  - `BackButton` — Round icon button with left arrow. Returns to Song Browser. Hover: subtle ring.
  - `SongTitleLabel` — Composition title, large semibold. Truncates with ellipsis at container width.
  - `RagaTalaComposerMeta` — Three label/value pairs: `RAGA: <name>`, `TALA: <name>`, `COMPOSER: <name>`. Values rendered in accent color (orange).
  - `EditInfoButton` — Outlined pill with pencil icon, opens metadata edit modal.
  - `FavoriteButton` — Pink-filled pill with heart icon. Toggles favorite state.
- **States:** Default | EditInfo modal open | Favorited (filled) / Unfavorited (outlined)
- **Requirements:** Title must remain readable when raga/tala/composer wrap.

### Z02 — Top-AudioControls-Zone

- **Position:** Top center band
- **Widgets:**
  - `MicMuteToggle` — Round icon button (mic with slash). Off in screenshot.
  - `PitchOffPill` — Wide oval pill labeled "PITCH OFF". Toggles real-time pitch detection overlay.
  - `TonicNoteSelector` — Horizontal segmented control of 12 chromatic notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B). Selected note (C) is filled green. Sets the tonic (Sa) reference for pitch display and drone.
  - `MuteSpeakerToggle` — Round icon button (speaker with X). Master output mute.
- **States:** Mic on/off | Pitch on/off | Tonic selected (one of 12) | Speaker mute on/off
- **Requirements:** Tonic selection must persist per song. Disabling pitch should hide pitch trail in lanes without unloading mic.

### Z03 — Top-FilesMenu-Zone

- **Position:** Top right corner
- **Widgets:**
  - `FilesDropdown` — Outlined button with stack icon, label "Files", caret. Opens file/version actions.
- **States:** Closed | Open menu

### Z04 — Transport-Zone

- **Position:** Second row, full width
- **Widgets:**
  - `SectionSelectorPill` — Mint-tinted pill showing the active section name ("MUKTAYI SVARA SAHITYAM"). Clickable to jump between sections.
  - `LoopButton` — Two circular arrows icon. Toggles A/B or section loop.
  - `RewindButton` — Anti-clockwise rotate icon. Returns playhead to start of section.
  - `SwaraSahityaToggle` — Two-segment switch (`SWARA` | `SAHITYA`). Sahitya is active in screenshot. Controls which token strip is highlighted/scrolled in the lanes.
  - `PlayButton` — Large green circular button with play triangle. Primary action.
  - `TimeReadout` — `MM:SS / MM:SS` display ("2:11 / 10:59"). Current / total.
  - `AavartanaCounter` — Two-number readout `<current> / <total> AAVARTANAS` ("10 / 41"). Tracks current tala cycle.
- **States:** Playing / Paused | Looping on/off | Swara vs Sahitya | At-start vs mid-song
- **Requirements:** Spacebar should toggle play/pause regardless of focused widget except text inputs.

### Z05 — EditorToolbar-Zone

- **Position:** Third row, full width, above lane stack
- **Widgets:**
  - `SectionsButton` — Outlined pill with grid icon, badge count "2". Opens section management drawer.
  - `TrimButton` — Outlined pill with scissors icon. Enters trim mode on the audio lane.
  - `ZoomOutButton` / `ZoomInButton` — Magnifier ± icons.
  - `ZoomPresetPills` — Inline `1x` `2x` `5x` `10x` segmented control.
  - `ZoomSlider` — Continuous horizontal slider for fine zoom (current ≈ 0.6x per `ZoomLevelBadge`).
  - `CalibrateButton` — Outlined pill with gauge icon. Highlighted (active) in screenshot. Enters calibration mode where the user marks the start of the composition relative to audio.
  - `CalibrationValueInput` — Numeric input "13.75" with unit "s". The current calibration offset.
  - `UndoButton` — Outlined pill, undo arrow. Disabled state in screenshot.
  - `LyricsButton` — Outlined pill, opens the lyrics editor side panel.
  - `ResetButton` — Outlined pill, resets edits to last saved state.
  - `HistoryButton` — Outlined pill, opens VersionHistory side panel.
  - `SaveButton` — Filled green pill, primary save action.
- **States:** Each tool — Default | Hover | Active (mode engaged) | Disabled
- **Requirements:** Active tool (e.g. Calibrate) must be visually distinct. Save button should indicate dirty state.

### Z06 — Audio-Lane-Zone

- **Position:** Top lane in main editing stack
- **Widgets:**
  - `LaneCollapseToggle` — Up-chevron in label tab. Collapses the lane.
  - `AudioLaneLabel` — Tab badge "AUDIO".
  - `TimelineRuler` — Top edge, second-resolution ticks ("2:06" … "2:30") that update with zoom and scroll.
  - `WaveformCanvas` — Green vertical-bar waveform rendered to canvas. Drag-to-scroll horizontally; click to seek.
  - `ZoomLevelBadge` — Bottom-right small badge ("0.6x") showing effective zoom factor.
  - `Playhead` — Vertical green line with subtle glow at the current play position. Spans Z06 → Z08 visually.
- **States:** Default | Trim mode (handles appear) | Calibrate mode (marker draggable) | Cut regions highlighted
- **Requirements:** Waveform must remain centered around the playhead during playback.

### Z07 — Sahitya-Lane-Zone

- **Position:** Middle lane
- **Widgets:**
  - `LaneCollapseToggle`
  - `SahityaLaneLabel` — Tab badge "SAHITYA".
  - `SahityaTokenStrip` — Horizontally scrolling row of sahitya syllables aligned 1:1 with swara tokens. Empty/placeholder in screenshot (lane appears blank — likely no sahitya for current section or collapsed content).
- **States:** Empty | Populated | Token in edit mode
- **Open Question:** Why is the strip blank at 2:11? Is the section "Muktayi Svara Sahityam" intended to have sahitya here, or is it Ettugade-style swara-only?

### Z08 — Swara-Lane-Zone

- **Position:** Bottom lane
- **Widgets:**
  - `LaneCollapseToggle`
  - `SwaraLaneLabel` — Tab badge "SWARA".
  - `SwaraTokenStrip` — Horizontally scrolling row of swara tokens (e.g. `R`, `N`, `S-`, `ND`, `D,p`, `nDm`…). Tokens centered in equal-width tiles.
  - `BarlineMarkers` — Single white vertical line for `|` separators.
  - `DoubleBarlineMarkers` — Amber double vertical line for `||` (avartana boundaries).
- **States:** Default | Token selected | Token in edit mode | Section start marker visible
- **Requirements:** Tokens must remain visually aligned with the audio waveform (and sahitya tokens if present) at the same x-coordinate.

### Z09 — Bottom-Seekbar-Zone

- **Position:** Fixed bottom mini-map across full width
- **Widgets:**
  - `CurrentTimeLabel` — Left, "2:11"
  - `TotalTimeLabel` — Right, "10:59"
  - `SectionMarkerChips` — Orange labeled chips above the seekbar marking section boundaries (visible: `PALLAVI`, `ANUPALLAVI`)
  - `SeekbarTrack` — Thin horizontal track. Filled green to current position.
  - `SeekbarHandle` — Round draggable handle at current position.
  - `SectionTickMarks` — Small ticks across the track marking aavartana or section starts.
- **States:** Idle | Dragging handle | Hover preview
- **Requirements:** Section chips should be clickable to jump.

---

### Interaction Map

| Trigger | Widget | Action |
|---|---|---|
| Click | Top-SongInfo-Zone__BackButton | Return to Song Browser |
| Click | Top-SongInfo-Zone__EditInfoButton | Open metadata edit modal |
| Click | Top-SongInfo-Zone__FavoriteButton | Toggle favorite |
| Click | Top-AudioControls-Zone__TonicNoteSelector (note) | Set tonic Sa |
| Click | Top-AudioControls-Zone__MicMuteToggle | Toggle mic input |
| Click | Top-AudioControls-Zone__PitchOffPill | Toggle pitch detection overlay |
| Click | Top-AudioControls-Zone__MuteSpeakerToggle | Toggle output mute |
| Click | Top-FilesMenu-Zone__FilesDropdown | Open files menu |
| Click | Transport-Zone__PlayButton | Play / pause |
| Click | Transport-Zone__SectionSelectorPill | Cycle / open section list |
| Click | Transport-Zone__LoopButton | Toggle loop |
| Click | Transport-Zone__RewindButton | Restart from section start |
| Click | Transport-Zone__SwaraSahityaToggle | Switch active token strip focus |
| Click | EditorToolbar-Zone__SectionsButton | Open section management drawer |
| Click | EditorToolbar-Zone__TrimButton | Enter trim mode |
| Click | EditorToolbar-Zone__CalibrateButton | Enter calibrate mode |
| Edit | EditorToolbar-Zone__CalibrationValueInput | Set calibration offset (seconds) |
| Click | EditorToolbar-Zone__LyricsButton | Open lyrics editor |
| Click | EditorToolbar-Zone__HistoryButton | Open version history sidebar |
| Click | EditorToolbar-Zone__SaveButton | Save current edits |
| Drag | Audio-Lane-Zone__WaveformCanvas | Scroll waveform / seek |
| Click | Audio-Lane-Zone__WaveformCanvas | Seek to clicked position |
| Click | Swara-Lane-Zone__SwaraTokenStrip (token) | Select / edit token |
| Drag | Bottom-Seekbar-Zone__SeekbarHandle | Scrub through song |
| Click | Bottom-Seekbar-Zone__SectionMarkerChips | Jump to section |
| Click | Z06–Z08 LaneCollapseToggle | Collapse / expand that lane |

### Open Questions for Design Review

- [ ] Sahitya lane is blank at the current playhead — is the lane truly empty for this section, or is there a rendering bug?
- [ ] `UndoButton` is disabled when no edits exist; what is the affordance for redo?
- [ ] Should `SectionsButton` and `Transport-Zone__SectionSelectorPill` be merged (they both deal with sections)?
- [ ] Calibrate active state visually competes with Save's primary green — confirm hierarchy.
- [ ] Aavartana counter "10 / 41" — does clicking it jump to a specific aavartana?

### UX Flags

- `[MED]` `EditorToolbar-Zone__UndoButton` is disabled but does not visually communicate disabled state strongly (looks similar to enabled outlined pills). Add reduced opacity or tooltip.
- `[MED]` `Sahitya-Lane-Zone__SahityaTokenStrip` rendering blank is ambiguous — distinguish "no sahitya for this section" from "lane collapsed" with explicit empty-state copy.
- `[LOW]` `Top-AudioControls-Zone__PitchOffPill` reads as a label, not a control — consider an explicit on/off icon or styled toggle.
- `[LOW]` `EditorToolbar-Zone__CalibrationValueInput` floats next to `CalibrateButton` without a clear visual link. A small "↳" or grouped container would clarify.

---

## Artifact 2 — Training Manual Section

### Understanding the Song Editor Screen

When you open a song from your library, you land on the Song Editor — the place where you can listen to a composition, edit its audio, and refine its swara and sahitya notation. The screen is divided into clear bands so you can find what you need.

### The Song Header (top-left)

This area tells you which song you're working on.

- The **back arrow** returns you to your song list.
- The **title** (for example, "Mate Malaya Dvaja") shows the composition name.
- Below it you see the **raga, tala, and composer**.
- The **Edit Info** button lets you change those details.
- The **heart button** marks the song as a favorite.

### The Audio Controls (top-center)

This row controls how you hear and tune the song.

- The **microphone button** turns your mic on or off (used for live pitch matching).
- The **Pitch Off** pill turns the live pitch display on or off.
- The **note selector** (C, C#, D … B) is where you pick your **tonic Sa**. The note that is filled in green is your current tonic.
- The **speaker button** mutes the song's audio playback.

### The Files Menu (top-right)

The **Files** button opens a menu where you can manage the audio file, swap recordings, or work with other versions.

### The Player Bar (second row)

This is your playback control center.

- The **section pill** on the left shows which part of the song you're in (for example, "Muktayi Svara Sahityam"). Click it to jump to a different section.
- The two small buttons next to it let you **loop** a passage or **restart** from the beginning of the section.
- The **Swara / Sahitya switch** chooses which line — solfège or lyrics — is the focus while you play.
- The big green **play button** starts and stops the song.
- To the right you see the **current time** and **total length** of the song.
- Then you see the **aavartana counter** ("10 / 41") which tells you how many tala cycles in you are.

### The Editing Toolbar (third row)

This row holds all the tools you use to edit the song.

- **Sections** opens a panel where you can see and rename the parts of the song.
- **Trim** lets you cut off unwanted audio at the start or end.
- The **zoom controls** (− / 1x / 2x / 5x / 10x / +) and the slider next to them let you zoom in on the waveform.
- **Calibrate** is for telling the editor exactly when the composition starts in the recording. The number next to it (for example, "13.75 s") is the current calibration offset.
- **Undo** reverses your last change.
- **Lyrics** opens a panel where you can write or edit the sahitya text.
- **Reset** throws away all unsaved changes.
- **History** opens a list of saved versions so you can compare or restore.
- **Save** (the green button) saves your edits.

### The Editing Lanes (middle of the screen)

The middle of the screen shows three stacked tracks. You can collapse any of them with the small arrow on its label.

- **Audio** — A green waveform of the recording. A ruler at the top shows the time. A vertical green line, the **playhead**, marks where you are right now. You can drag the waveform left or right to scrub, or click anywhere to jump to that point.
- **Sahitya** — The lyrics, written one syllable at a time, lined up with the audio.
- **Swara** — The solfège notation (S, R, G, M, P, D, N), also lined up with the audio. White vertical lines mark beats; amber double lines mark the end of an aavartana.

### The Seekbar (bottom of the screen)

The thin bar at the very bottom is a mini-map of the whole song.

- The numbers on either side show the **current time** and the **total length**.
- The orange labels above the bar (such as **Pallavi** and **Anupallavi**) show you where each section begins. Click them to jump.
- Drag the round handle to scrub anywhere in the song.

> **Tip:** The fastest way to find a passage is to click its section label on the bottom seekbar — much faster than scrolling through the waveform.
