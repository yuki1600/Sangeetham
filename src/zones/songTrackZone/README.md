# `src/zones/songTrackZone/`

The **Song Track Zone** — middle zone of the Song View. Owns the five vertical tracks (Sound, Sahitya, Swara, Instrument 1, Instrument 2) and the cross-track behaviours (drag-to-seek, wheel-to-pan, playhead overlay, avartana boundary lines). See [PRD §2.2](../../../docs/PRD.md#22-song-track-zone).

## Status

Partially shipped:

- **Track abstraction primitives** (`<TrackControls>`, `<TrackResizeHandle>`) are built and live at [`src/components/songview/`](../../components/songview/). Phase 3 moves them here.
- **Central state** is in [`src/hooks/useTrackMixer.js`](../../hooks/useTrackMixer.js).
- **The three current tracks** (Sound, Sahitya, Swara) are inlined in [`src/components/editor/EditorSongView.jsx`](../../components/editor/EditorSongView.jsx) lines ~1500–1750. Phase 3 extracts them.
- **Instrument tracks** (Tala, Tambura) don't exist yet — Phase 4.

## Target file layout

```
songTrackZone/
├── README.md                        ← this file
├── SongTrackZone.jsx                container, owns drag-seek + wheel-pan,
│                                    renders all 5 tracks + playhead + boundary overlay
├── TrackControls.jsx                mute / solo / volume row (audio tracks only)
├── TrackResizeHandle.jsx            bottom-edge drag handle
├── tracks/
│   ├── SoundTrack.jsx               wraps WaveformEditor, owns the trim popup
│   ├── SahityaTrack.jsx             wraps NotationLane type='sahitya'
│   ├── SwaraTrack.jsx               wraps NotationLane type='swara'
│   ├── InstrumentTrack.jsx          generic Tone.js track (Phase 4)
│   └── instrumentVoices.js          Tala + Tambura voice factories (Phase 4)
```

## The track contract

Every track in this zone follows the same shape:

```jsx
<div className="track relative" style={{ height: visible ? heightPx : 36 }}>
  {/* 1. Track header — clickable label that toggles visibility */}
  <TrackHeader id={id} label={label} visible={visible} onToggle={...} />

  {/* 2. Track Controls — only when audio/synth, only when visible */}
  {kind !== 'visual' && visible && <TrackControls state={state} onChange={...} />}

  {/* 3. Track content — waveform / notation / synth visualization */}
  {visible && <YourContent ... />}

  {/* 4. Resize handle — bottom edge, only when visible */}
  {visible && <TrackResizeHandle heightPx={heightPx} onResize={...} />}
</div>
```

## State management

All track state lives in [`useTrackMixer`](../../hooks/useTrackMixer.js):

```ts
type TrackState = {
  kind: 'audio' | 'visual' | 'synth'
  label: string
  // audio/synth only:
  muted?: boolean
  solo?: boolean
  volume?: number    // 0..1
  // all tracks:
  visible: boolean
  heightPx: number
}

const { tracks, setTrackState, wireSoundTrack } = useTrackMixer()
```

`tracks.sound` is the only audio track today; `tracks.sahitya` and `tracks.swara` are visual; instruments will be `'synth'`.

## Cross-track behaviours

- **Wheel pan:** wired once on `<SongTrackZone>` via `useWheelZoom` so trackpad horizontal swipes scrub the playhead from anywhere in the zone — not just over individual tracks.
- **Drag seek:** wired on the same container via `useDragSeek`.
- **Playhead:** fixed at 12.5% of the zone width (`PLAYHEAD` constant from `src/constants/playback.js`).
- **Avartana boundary overlay:** absolutely positioned across all tracks via [`AvartanaBoundaryOverlay`](../../components/AvartanaBoundaryOverlay.jsx).
