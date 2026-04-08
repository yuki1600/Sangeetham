import React from 'react';
import { formatTime } from '../../utils/formatTime';

/**
 * Bottom Bar → Time Controls
 *
 * The existing seek slider (pre-Phase-3 form — lives in the Bottom Bar until
 * Phase 4 splits Admin Controls + Condensed Song Track out to the sides).
 *
 * Contents:
 *   • CurrentTimeLabel (left)
 *   • Section marker bands tiled above the track
 *   • Aavartana tick marks on the track
 *   • Seek track + fill + thumb
 *   • TotalTimeLabel (right)
 *
 * Interaction: click/drag on the track to scrub (handled by the useSeekBar
 * hook in the parent; we wire its ref + handlers through). Click a section
 * band to jump to that section's start — we call onSeek(time).
 *
 * This component is a pure view over props. All state (currentTime,
 * sectionRanges, etc.) comes from the parent.
 */
export default function TimeControls({
    // playback state
    currentTime,
    effectiveDuration,
    currentSection,
    // section bands
    sectionRanges,
    // avartana ticks
    aavartanas,
    effectiveAavartanaSec,
    // seek bar wiring (from useSeekBar in the parent)
    seekBarRef,
    seekBarWidth,
    onSeekMouseDown,
    onSeekTouchStart,
    // section click → jump
    onSeek,
    // theme
    isDark,
}) {
    return (
        <div className="flex items-center gap-4 w-full" style={{ maxWidth: 1000 }}>
            <span className="text-sm tabular-nums font-mono font-bold" style={{ color: '#10b981', minWidth: 44 }}>
                {formatTime(currentTime)}
            </span>

                {/* Track wrapper: labels + slider positioned relative to track */}
                <div
                    ref={seekBarRef}
                    onMouseDown={onSeekMouseDown}
                    onTouchStart={onSeekTouchStart}
                    style={{
                        flex: 1,
                        position: 'relative',
                        paddingTop: 36,
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                >
                    {/* Section bands — one horizontal strip per section spanning
                        its [start, end] range. Section name is tiled marquee-style
                        across the band so the label is visible regardless of how
                        wide or narrow the band is. */}
                    {sectionRanges.map((range, ri) => {
                        if (effectiveDuration <= 0) return null;
                        const startFrac = Math.max(0, Math.min(1, range.start / effectiveDuration));
                        const endFrac = Math.max(0, Math.min(1, range.end / effectiveDuration));
                        const widthFrac = Math.max(0, endFrac - startFrac);
                        if (widthFrac <= 0) return null;
                        const widthPx = widthFrac * (seekBarWidth || 0);
                        // Width model: uppercase bold char width ≈ font_px × CHAR_EM,
                        // plus PAD_PX of inner padding. Same formula at every font
                        // size, so the shrink is consistent.
                        const BASE_FONT = 11;
                        const CHAR_EM = 0.72;
                        const PAD_PX = 12;
                        const chars = range.section.length;
                        const labelAt = (fp) => chars * fp * CHAR_EM + PAD_PX;
                        // Start at base font; shrink to fit when even one copy
                        // doesn't fit. Floor at 7px so it stays legible.
                        let fontPx = BASE_FONT;
                        if (widthPx > 0 && labelAt(BASE_FONT) > widthPx) {
                            fontPx = Math.max(7, Math.floor((widthPx - PAD_PX) / (chars * CHAR_EM)));
                        }
                        const labelPx = labelAt(fontPx);
                        // Tile a second copy only when the band can comfortably
                        // fit two full labels.
                        const repeatCount = labelPx > 0
                            ? Math.max(1, Math.floor(widthPx / labelPx))
                            : 1;
                        const isCurrent = currentSection === range.section;
                        return (
                            <div
                                key={`${range.section}-${ri}`}
                                className="absolute flex items-center font-black uppercase cursor-pointer rounded overflow-hidden"
                                style={{
                                    left: `${startFrac * 100}%`,
                                    width: `${widthFrac * 100}%`,
                                    top: 0,
                                    height: 26,
                                    fontSize: `${fontPx}px`,
                                    letterSpacing: '0.04em',
                                    zIndex: 5,
                                    background: isCurrent
                                        ? 'rgba(251,191,36,0.9)'
                                        : 'rgba(251,191,36,0.45)',
                                    color: isCurrent ? '#000' : '#1f1300',
                                    border: '1px solid rgba(251,191,36,0.6)',
                                    justifyContent: repeatCount > 1 ? 'space-around' : 'center',
                                    backdropFilter: 'blur(4px)',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSeek(range.start);
                                }}
                                title={`${range.section} — ${formatTime(range.start)} → ${formatTime(range.end)}`}
                            >
                                {Array.from({ length: repeatCount }).map((_, i) => (
                                    <span
                                        key={i}
                                        className="whitespace-nowrap"
                                        style={{ padding: '0 6px' }}
                                    >
                                        {range.section}
                                    </span>
                                ))}
                            </div>
                        );
                    })}

                    {/* Actual slider track area */}
                    <div style={{ position: 'relative', height: 44 }}>
                        {/* Track background */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: 6,
                            borderRadius: 3,
                            background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                        }}>
                            {/* Aavartana tick marks */}
                            {aavartanas.map((_, i) => {
                                const frac = (i * effectiveAavartanaSec) / (effectiveDuration || 1);
                                if (frac >= 1 || i === 0) return null;
                                return <div key={i} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${frac * 100}%`, background: isDark ? '#fff' : '#000' }} />;
                            })}
                        </div>
                        {/* Filled portion */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: 6,
                            borderRadius: 3,
                            width: `${Math.min(100, (currentTime / (effectiveDuration || 1)) * 100)}%`,
                            background: 'linear-gradient(to right, #10b981, #34d399)',
                            boxShadow: '0 0 8px rgba(16,185,129,0.3)',
                        }} />
                        {/* Thumb */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: `${Math.min(100, (currentTime / (effectiveDuration || 1)) * 100)}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '3px solid #fff',
                            boxShadow: '0 0 0 3px rgba(16,185,129,0.25), 0 2px 8px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                            zIndex: 2,
                        }} />
                    </div>
                </div>

            <span className="text-sm tabular-nums font-mono font-bold" style={{ color: 'var(--text-muted)', minWidth: 44, textAlign: 'right' }}>
                {formatTime(effectiveDuration)}
            </span>
        </div>
    );
}
