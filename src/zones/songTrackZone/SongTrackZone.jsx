import React, { useRef } from 'react';
import { Repeat } from 'lucide-react';
import AvartanaBoundaryOverlay from '../../components/AvartanaBoundaryOverlay';
import SoundTrack from './tracks/SoundTrack';
import SahityaTrack from './tracks/SahityaTrack';
import SwaraTrack from './tracks/SwaraTrack';
import { PX_PER_SEC, PLAYHEAD } from '../../constants/playback';
import { useWheelZoom } from '../../hooks/useWheelZoom';

/**
 * Song Track Zone — middle zone of the Song View.
 *
 * Owns the `<main>` element that hosts the 5 tracks (Sound / Sahitya /
 * Swara today; Instrument 1 + 2 in Phase 4). Wires the cross-track
 * behaviours (drag-seek, wheel-pan), the playhead overlay, the loop range
 * overlay, and the AvartanaBoundaryOverlay.
 *
 * The `<main>` ref is local to this component (not forwarded from the
 * parent) so `useWheelZoom` attaches its wheel listener directly without
 * any parent-to-child indirection — that indirection was unreliable on
 * dev StrictMode remounts.
 */
export default function SongTrackZone({
    // drag handlers spread on <main>
    dragHandlers,
    isDragging,
    // mixer
    tracks,
    setTrackState,
    trackOrder,
    moveTrack,
    // composition + timings
    aavartanas,
    aavartanaTimings,
    contentRows,
    contentRowTimings,
    avPerRow,
    effectiveDuration,
    effectiveAavartanaSec,
    sectionMarkers,
    // playback
    currentTime,
    currentTimeRef,
    audioRef,
    setCurrentTime,
    // sound track audio
    editedBuffer,
    // editor interactions
    editorMode,
    activeSelection,
    setActiveSelection,
    handleDeleteSelection,
    // zoom / pan
    waveZoom,
    setWaveZoom,
    handleWheelPan,
    // loop overlay
    loopRange,
    // editing
    handleTokenEdit,
    handleRowDuplicate,
    handleRowDelete,
    // theme
    theme,
    isDark,
    borderColor,
}) {
    // Resolved per-track move handlers + edge flags. Computed once per render
    // from the order array so the per-track components don't have to know
    // about siblings or the order list at all.
    const orderHelpers = (id) => {
        const idx = trackOrder.indexOf(id);
        return {
            onMoveUp: () => moveTrack(id, -1),
            onMoveDown: () => moveTrack(id, +1),
            canMoveUp: idx > 0,
            canMoveDown: idx >= 0 && idx < trackOrder.length - 1,
        };
    };

    const renderTrack = (id) => {
        const helpers = orderHelpers(id);
        if (id === 'sound') {
            return (
                <SoundTrack
                    key="sound"
                    state={tracks.sound}
                    onStateChange={(patch) => setTrackState('sound', patch)}
                    audioBuffer={editedBuffer}
                    effectiveDuration={effectiveDuration}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    sectionMarkers={sectionMarkers}
                    currentTime={currentTime}
                    currentTimeRef={currentTimeRef}
                    audioRef={audioRef}
                    setCurrentTime={setCurrentTime}
                    editorMode={editorMode}
                    activeSelection={activeSelection}
                    setActiveSelection={setActiveSelection}
                    handleDeleteSelection={handleDeleteSelection}
                    waveZoom={waveZoom}
                    setWaveZoom={setWaveZoom}
                    handleWheelPan={handleWheelPan}
                    theme={theme}
                    isDark={isDark}
                    borderColor={borderColor}
                    {...helpers}
                />
            );
        }
        if (id === 'sahitya') {
            return (
                <SahityaTrack
                    key="sahitya"
                    state={tracks.sahitya}
                    onStateChange={(patch) => setTrackState('sahitya', patch)}
                    aavartanas={aavartanas}
                    aavartanaTimings={aavartanaTimings}
                    contentRows={contentRows}
                    contentRowTimings={contentRowTimings}
                    effectiveDuration={effectiveDuration}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    avPerRow={avPerRow}
                    currentTime={currentTime}
                    currentTimeRef={currentTimeRef}
                    waveZoom={waveZoom}
                    setWaveZoom={setWaveZoom}
                    handleWheelPan={handleWheelPan}
                    handleTokenEdit={handleTokenEdit}
                    handleRowDuplicate={handleRowDuplicate}
                    handleRowDelete={handleRowDelete}
                    theme={theme}
                    isDark={isDark}
                    borderColor={borderColor}
                    {...helpers}
                />
            );
        }
        if (id === 'swara') {
            return (
                <SwaraTrack
                    key="swara"
                    state={tracks.swara}
                    onStateChange={(patch) => setTrackState('swara', patch)}
                    aavartanas={aavartanas}
                    aavartanaTimings={aavartanaTimings}
                    contentRows={contentRows}
                    contentRowTimings={contentRowTimings}
                    effectiveDuration={effectiveDuration}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    avPerRow={avPerRow}
                    currentTime={currentTime}
                    currentTimeRef={currentTimeRef}
                    waveZoom={waveZoom}
                    setWaveZoom={setWaveZoom}
                    handleWheelPan={handleWheelPan}
                    handleTokenEdit={handleTokenEdit}
                    theme={theme}
                    isDark={isDark}
                    {...helpers}
                />
            );
        }
        return null;
    };

    // Local ref + wheel listener — attached here so the wheel handler is
    // wired in the same component that owns the DOM node. Pinch / vertical
    // wheel → zoom; horizontal trackpad swipe → pan via handleWheelPan.
    const mainRef = useRef(null);
    useWheelZoom(mainRef, waveZoom, setWaveZoom, { onPan: handleWheelPan });

    return (
        <main
            ref={mainRef}
            className={`flex-1 flex flex-col relative overflow-hidden select-none ${editorMode === 'view' && isDragging ? 'cursor-grabbing' : editorMode === 'view' ? 'cursor-grab' : 'cursor-default'}`}
            {...dragHandlers}
        >
            {/* Avartana boundary lines spanning all tracks */}
            {contentRows.length > 0 && (
                <AvartanaBoundaryOverlay
                    contentRows={contentRows}
                    contentRowTimings={contentRowTimings}
                    avPerRow={avPerRow}
                    aavartanaSec={effectiveAavartanaSec}
                    timeRef={currentTimeRef}
                    playheadFraction={PLAYHEAD}
                    pxPerSec={PX_PER_SEC}
                    zoom={waveZoom}
                    isDark={isDark}
                />
            )}

            {/* Visual playhead — fixed at PLAYHEAD fraction of zone width */}
            <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: `${PLAYHEAD * 100}%` }}>
                <div className="absolute inset-y-0" style={{ width: 24, left: -12, background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.18), transparent)' }} />
                <div className="absolute inset-y-0 w-1" style={{ left: -0.5, background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }} />
                <div className="absolute" style={{ top: 0, left: -5, width: 10, height: 10, background: '#10b981', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
            </div>

            {/* Loop range overlay */}
            {loopRange && (
                <div
                    className="absolute inset-y-0 z-10 pointer-events-none transition-none"
                    style={{
                        left: `calc(${PLAYHEAD * 100}% + ${(loopRange.start - currentTime) * PX_PER_SEC * waveZoom}px)`,
                        width: `${(loopRange.end - loopRange.start) * PX_PER_SEC * waveZoom}px`,
                        background: 'rgba(16,185,129,0.15)',
                        borderLeft: '1px solid rgba(16,185,129,0.5)',
                        borderRight: '1px solid rgba(16,185,129,0.5)',
                        willowChange: 'left, width',
                    }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                        <Repeat className="w-12 h-12 text-emerald-400" />
                    </div>
                </div>
            )}

            {trackOrder.map(renderTrack)}
        </main>
    );
}
