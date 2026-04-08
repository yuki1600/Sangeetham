# `src/zones/bottomBar/`

The **Bottom Bar** — bottom zone of the Song View. Three cells: Admin Controls (left) | Condensed Song Track (middle) | Time Controls (right). See [PRD §2.3](../../../docs/PRD.md#23-bottom-bar).

## Status

Partially shipped:

- **Time Controls** — the existing seek bar with section bands. Currently inlined in `EditorSongView.jsx` lines ~1800–1950. Phase 3 extracts.
- **Admin Controls** — the existing **Reset** and **Files** buttons. Currently in the Edit toolbar. Phase 3 relocates here.
- **Condensed Song Track** — minimap. Doesn't exist yet — Phase 4.

## Target file layout

```
bottomBar/
├── README.md                        ← this file
├── BottomBar.jsx                    container, owns the 3-cell layout
├── AdminControls.jsx                Reset + Files buttons (relocated from Edit toolbar)
├── MinimapTrack.jsx                 condensed waveform with viewport indicator (Phase 4)
└── TimeControls.jsx                 current/total time + seek bar
```

## "Admin Controls" disambiguation

This is **song-level** admin: actions you take occasionally on the current song (reset edits, manage files for this song). It is NOT the site-wide admin console — that lives at [`src/admin/`](../../admin/) and ships in Phase 7.

## Condensed Song Track (Phase 4)

Compact representation of the entire song, sitting horizontally across the middle cell:

- **Waveform peaks** for the full edited buffer, downsampled to fit the bar width. Reuses the peak-extraction loop from [`WaveformEditor.jsx:63-78`](../../components/editor/WaveformEditor.jsx) — Phase 4 extracts that loop into `src/utils/waveformPeaks.js`.
- **Section bands** overlaid as semi-transparent strips, reusing the existing `sectionRanges` memo.
- **Viewport indicator** — a translucent rectangle showing what's currently visible in the Sound Track. Updates as the user pans/zooms.
- **Click anywhere** → seek the playhead.
- **Drag the viewport rectangle** → continuous scrub.

## State / props contract

```ts
type BottomBarProps = {
  // for Admin Controls
  handleResetAllEdits()
  handleDownloadJSON(edited: boolean)
  handleDownloadOriginalAudio()
  handleDownloadEditedMP3()
  // for Minimap
  editedBuffer: AudioBuffer | null
  sectionRanges: { section: string, start: number, end: number }[]
  effectiveDuration: number
  currentTime: number
  visibleRange: { startTime: number, endTime: number } // viewport indicator
  onSeek(t: number)
  // for Time Controls
  audioRef, currentTimeRef
  // theme
  theme
}
```
