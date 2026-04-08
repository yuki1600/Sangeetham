# `src/zones/audioControlZone/`

The **Audio Control Zone** — top zone of the Song View. Owns the song header, transport controls, edit toolbar, master mix, and composer info. See [PRD §2.1](../../../docs/PRD.md#21-audio-control-zone).

## Status

This directory is a **shell** — it exists to anchor the per-zone modularization but no code has moved here yet. The Audio Control Zone is currently inlined inside [`src/components/editor/EditorSongView.jsx`](../../components/editor/EditorSongView.jsx) (lines ~700–1500). Phase 3 of the [roadmap](../../../docs/PRD.md#7-roadmap) decomposes that into the files listed below.

## Target file layout

```
audioControlZone/
├── README.md                        ← this file
├── AudioControlZone.jsx             grid container, owns the 4×2 layout
├── SongInfoPanel.jsx                back button, title, raga, tala, edit-info, favorite
├── TransportControls.jsx            loop, restart, swara/sahitya toggle, play/pause, time
├── SpeedPitchControls.jsx           tempo + pitch shift sliders (Phase 4)
├── EditControls.jsx                 sections, trim, calibrate, lyrics, save
├── AudioMixerControls.jsx           master volume, drone, mic monitor (Phase 4)
└── ComposerInfoPanel.jsx            composer, composition type, arohana/avarohana
```

## Props / state contract

`<AudioControlZone>` receives the song state and dispatchers from the parent orchestrator and fans them out to the cell components. Stable contract:

```ts
type AudioControlZoneProps = {
  songData: SongDataT          // from /api/songs/:id
  composition: CompositionT
  // playback (refs from usePlaybackEngine)
  audioRef, currentTime, isPlaying, totalDuration
  togglePlay(), restartAudio(), seek(t)
  // edit
  editorMode, setEditorMode
  showSections, setShowSections
  showLyrics, setShowLyrics
  showHistory, setShowHistory
  saveStatus, isSaving
  handleSave()
  // calibration
  customAavartanaSec, setCustomAavartanaSec
  // master mix (Phase 4)
  speed, setSpeed
  pitch, setPitch
  masterVolume, setMasterVolume
  droneOn, setDroneOn
  micMonitorOn, setMicMonitorOn
  // theme
  theme
}
```

## What this zone does NOT own

- **Sound Track waveform.** That's the [Song Track Zone](../songTrackZone/README.md).
- **Section cues row.** Currently inside the Edit toolbar; opened via the Sections button. Stays here when extracted.
- **Version history sidebar.** It's a global modal — opened by the History button (which lives in `EditControls`) but rendered at the top level of the Song View, not inside this zone.
