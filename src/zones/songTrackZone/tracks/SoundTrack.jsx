import React from 'react';
import { ChevronUp, ChevronDown, Scissors, X } from 'lucide-react';
import WaveformEditor from '../../../components/editor/WaveformEditor';
import TrackControls from '../../../components/songview/TrackControls';
import TrackResizeHandle from '../../../components/songview/TrackResizeHandle';
import TrackOrderButtons from '../../../components/songview/TrackOrderButtons';
import { PX_PER_SEC, PLAYHEAD } from '../../../constants/playback';

/**
 * Song Track Zone → Sound Track
 *
 * The Sound Track renders the edited audio buffer as a waveform via
 * WaveformEditor. It's the only audio-bearing track (Sahitya/Swara are
 * visual-only) so it's the one that carries the inline TrackControls row
 * (mute / solo / volume) below its header.
 *
 * Track-level responsibilities live here:
 *   • Visibility toggle (click on the label to collapse/expand)
 *   • Inline TrackControls (Phase 2 primitive)
 *   • Drag-to-resize bottom edge
 *   • Trim-mode "Delete selection" popup
 */
export default function SoundTrack({
    state,                          // tracks.sound
    onStateChange,                  // (patch) => setTrackState('sound', patch)
    // audio data
    audioBuffer,
    effectiveDuration,
    effectiveAavartanaSec,
    sectionMarkers,
    // playback
    currentTime,
    currentTimeRef,
    audioRef,
    setCurrentTime,
    // editor interactions
    editorMode,
    activeSelection,
    setActiveSelection,
    handleDeleteSelection,
    // zoom / pan
    waveZoom,
    setWaveZoom,
    handleWheelPan,
    // ordering
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    // theme
    theme,
    isDark,
    borderColor,
}) {
    const { visible, heightPx } = state;
    // When expanded the WaveformEditor draws a 22px ruler at the top, so the
    // header sits below it (top: 30). When collapsed there's no ruler, so the
    // header centers inside the 36px collapsed strip (top: 6).
    const headerTop = visible ? 30 : 6;

    return (
        <div className="relative flex-shrink-0" style={{
            height: visible ? heightPx : 36,
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'hidden',
        }}>
            {/* Track header — sits BELOW the WaveformEditor's 22px time ruler
                (top: 30 = 22 ruler + 8 breathing room) so it doesn't overlap
                tick labels. When collapsed the ruler is gone, so we use a
                smaller `top` to keep the label visible inside the 36px
                collapsed strip. When expanded the TrackControls row stacks
                vertically *below* the label.

                The track-order arrows live INSIDE the header cluster, next
                to the label, so the whole "what is this track + reorder it"
                control sits in one place on the left. */}
            <div className="absolute z-30 pointer-events-none" style={{ top: headerTop, left: 16 }}>
                <div className="pointer-events-auto inline-flex flex-col items-start gap-1.5">
                    <div className="inline-flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => onStateChange({ visible: !visible })}
                            title={visible ? 'Collapse Sound Track' : 'Expand Sound Track'}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
                            style={{
                                background: isDark ? 'rgba(20,20,32,0.78)' : 'rgba(255,255,255,0.88)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                                color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(6px)',
                            }}
                        >
                            {visible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            Sound
                        </button>
                        <TrackOrderButtons
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            isDark={isDark}
                        />
                    </div>
                    {visible && (
                        <TrackControls
                            state={state}
                            onChange={onStateChange}
                            isDark={isDark}
                        />
                    )}
                </div>
            </div>

            {visible && (
                <WaveformEditor
                    audioBuffer={audioBuffer}
                    currentTime={currentTime}
                    timeRef={currentTimeRef}
                    originalDuration={effectiveDuration}
                    editorMode={editorMode}
                    selection={activeSelection}
                    onSelectionChange={setActiveSelection}
                    sectionMarkers={sectionMarkers}
                    theme={theme}
                    playheadFraction={PLAYHEAD}
                    aavartanaSec={effectiveAavartanaSec}
                    zoom={waveZoom}
                    onZoomChange={setWaveZoom}
                    onPan={handleWheelPan}
                    pxPerSec={PX_PER_SEC}
                    onSeek={(t) => {
                        if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = t;
                        currentTimeRef.current = t;
                        setCurrentTime(t);
                    }}
                />
            )}

            {/* Delete selection popup — only in trim mode when a region is picked */}
            {visible && editorMode === 'trim' && activeSelection && activeSelection.endTime != null &&
                Math.abs(activeSelection.endTime - activeSelection.startTime) >= 0.1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-xl shadow-xl border"
                    style={{
                        background: isDark ? 'rgba(20,20,32,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(8px)',
                        borderColor: 'rgba(239,68,68,0.3)',
                    }}
                >
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        {Math.abs(activeSelection.endTime - activeSelection.startTime).toFixed(2)}s selected
                    </span>
                    <button
                        onClick={handleDeleteSelection}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                        style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                    >
                        <Scissors className="w-3.5 h-3.5" />
                        Delete
                    </button>
                    <button
                        onClick={() => setActiveSelection(null)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all opacity-50 hover:opacity-100"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {visible && (
                <TrackResizeHandle
                    heightPx={heightPx}
                    onResize={(h) => onStateChange({ heightPx: h })}
                    isDark={isDark}
                />
            )}
        </div>
    );
}
