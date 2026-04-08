import React, { useMemo } from 'react';
import { parseTalaBeats, currentBeat } from '../../utils/talaBeats';

/**
 * Bottom Bar → Metronome
 *
 * Beat-cycle indicator pinned to the right side of the Bottom Bar. Larger,
 * dot-free design — the prominent thing is a big beat counter ("3 / 8") so
 * the user can read the current beat at a glance from across the room.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ TALA                         │
 *   │ ADI · 4+2+2          3  / 8  │
 *   └──────────────────────────────┘
 *
 * The label cluster is on the left (TALA + name + anga structure) and the
 * big beat counter on the right. No dots — they were too small to read at
 * the previous size and added clutter.
 *
 * Beat math: secondsPerBeat = effectiveAavartanaSec / totalBeats. Current
 * beat = floor(currentTime / secondsPerBeat) mod totalBeats + 1. The
 * component re-renders on every parent rAF tick (currentTime changes), but
 * the render is tiny so it's fine.
 */
export default function Metronome({
    tala,                    // string, e.g. "Adi"
    currentTime,             // seconds (live from parent rAF)
    effectiveAavartanaSec,   // calibrated āvartana duration
    talaStartTime = 0,       // Pallavi (first section) cue — beat 1 starts here
    isDark,
    borderColor,
}) {
    const beatStructure = useMemo(() => parseTalaBeats(tala), [tala]);

    if (!beatStructure) {
        return (
            <div
                className="flex items-center px-5 rounded-2xl border flex-shrink-0"
                style={{
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${borderColor}`,
                    height: 80,
                    minWidth: 180,
                }}
                title="Tala not recognised — metronome unavailable"
            >
                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-40">No Tala</span>
            </div>
        );
    }

    const { totalBeats, angas } = beatStructure;
    const beat = currentBeat(currentTime, effectiveAavartanaSec, totalBeats, talaStartTime);
    const angaText = angas.join(' + ');
    // Lead-in: while the playhead is before the Pallavi cue, we don't want a
    // misleading "1" pulsing on the metronome — show the beat dimmed instead.
    const beforeStart = currentTime < talaStartTime;
    // Pulse the bg slightly on every beat — gives the user a visual heartbeat
    // without adding extra DOM. Tied to the beat number so it ticks once per
    // beat boundary (the modulo gives a fresh value each time). Suppressed
    // during the lead-in so it doesn't tick before the song actually starts.
    const pulse = !beforeStart && beat % 2 === 1;

    return (
        <div
            className="flex items-center justify-between gap-5 px-5 rounded-2xl border flex-shrink-0 transition-colors duration-100"
            style={{
                background: isDark
                    ? (pulse ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)')
                    : (pulse ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.96)'),
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(8px)',
                boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.06)',
                height: 80,
                minWidth: 240,
            }}
            title={`${tala} — ${totalBeats} beats per āvartana (${angaText})`}
        >
            {/* Left: TALA / NAME / anga structure */}
            <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-50">Tala</span>
                <span
                    className="text-lg font-black uppercase tracking-[0.1em] -mt-0.5"
                    style={{ color: isDark ? '#fff' : '#000', fontFamily: "'Outfit', sans-serif" }}
                >
                    {tala}
                </span>
                <span className="text-[10px] font-bold opacity-50 tabular-nums mt-0.5">
                    {angaText}
                </span>
            </div>

            {/* Right: very big beat counter */}
            <div className="flex items-baseline gap-1 tabular-nums leading-none">
                <span
                    className="font-black"
                    style={{
                        color: beforeStart ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') : '#10b981',
                        fontSize: 44,
                        fontFamily: "'Outfit', sans-serif",
                        textShadow: beforeStart ? 'none' : '0 0 24px rgba(16,185,129,0.45)',
                        minWidth: 44,
                        textAlign: 'right',
                        display: 'inline-block',
                    }}
                >
                    {beat}
                </span>
                <span className="text-base font-bold opacity-40">/ {totalBeats}</span>
            </div>
        </div>
    );
}
