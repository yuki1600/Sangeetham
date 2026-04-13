import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import NotationLane from '../../../components/NotationLane';
import TrackResizeHandle from '../../../components/songview/TrackResizeHandle';
import TrackOrderButtons from '../../../components/songview/TrackOrderButtons';
import { PX_PER_SEC, PLAYHEAD } from '../../../constants/playback';

/**
 * Song Track Zone → Sahitya Track
 *
 * Visual-only lyrics track. Wraps NotationLane in `type='sahitya'` + text
 * mode. Has a visibility toggle and a drag-resize handle, but NO inline
 * TrackControls row (no audio output, so mute/solo/volume don't apply).
 *
 * The onRowDuplicate / onRowDelete props let the user add/remove full
 * content rows from the composition via hover icons in NotationLane.
 */
export default function SahityaTrack({
    state,                          // tracks.sahitya
    onStateChange,                  // (patch) => setTrackState('sahitya', patch)
    // composition + timings
    aavartanas,
    aavartanaTimings,
    contentRows,
    contentRowTimings,
    effectiveDuration,
    effectiveAavartanaSec,
    avPerRow,
    // playback
    currentTime,
    currentTimeRef,
    // zoom / pan
    waveZoom,
    setWaveZoom,
    handleWheelPan,
    // editing
    handleTokenEdit,
    handleRowDuplicate,
    handleRowDelete,
    // ordering
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    // theme
    theme,
    isDark,
    borderColor,
    canEdit = true,
}) {
    const { visible, heightPx } = state;
    // Expanded → 14px gap below the separator. Collapsed → smaller top so the
    // pill stays inside the 36px collapsed strip.
    const headerTop = visible ? 14 : 6;

    return (
        <div className="relative transition-all duration-200" style={{
            flexShrink: 0,
            height: visible ? heightPx : 36,
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'hidden',
        }}>
            {/* Track header — flat label pill positioned BELOW the separator
                line above (top: 14 expanded; smaller when collapsed so it
                stays inside the 36px collapsed strip). The track-order
                arrows sit immediately to the right of the label so the
                whole header cluster lives on the left. */}
            <div className="absolute z-30 pointer-events-none" style={{ top: headerTop, left: 16 }}>
                <div className="pointer-events-auto inline-flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onStateChange({ visible: !visible })}
                        title={visible ? 'Collapse Sahitya Track' : 'Expand Sahitya Track'}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
                        style={{
                            background: isDark ? 'rgba(20,20,32,0.78)' : 'rgba(255,255,255,0.88)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        {visible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Sahitya
                    </button>
                    {canEdit && (
                        <TrackOrderButtons
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            isDark={isDark}
                        />
                    )}
                </div>
            </div>

            {visible && contentRows.length > 0 && (
                <div className="absolute inset-0" style={{ top: '0px' }}>
                    <NotationLane
                        aavartanas={aavartanas}
                        aavartanaTimings={aavartanaTimings}
                        contentRowTimings={contentRowTimings}
                        currentTime={currentTime}
                        timeRef={currentTimeRef}
                        totalDuration={effectiveDuration}
                        playheadFraction={PLAYHEAD}
                        aavartanaSec={effectiveAavartanaSec}
                        type="sahitya"
                        theme={theme}
                        onTokenEdit={handleTokenEdit}
                        textMode={true}
                        contentRows={contentRows}
                        avPerRow={avPerRow}
                        pxPerSec={PX_PER_SEC}
                        zoom={waveZoom}
                        onZoomChange={setWaveZoom}
                        onPan={handleWheelPan}
                        onRowDuplicate={handleRowDuplicate}
                        onRowDelete={handleRowDelete}
                        canEdit={canEdit}
                    />
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
