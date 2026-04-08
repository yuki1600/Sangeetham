import React, { useEffect, useMemo, useRef } from 'react';

/**
 * Cross-lane vertical lines marking the END of each āvartana.
 *
 * Mounts as an absolute overlay inside <main> so its lines extend
 * across all three lanes (audio, sahitya, swara). Scrolls horizontally
 * via rAF using the same formula as NotationLane / WaveformEditor:
 *   offset = currentTime * pxPerSec * zoom
 *
 * Boundary positions are derived from `contentRows` so they line up
 * exactly with how NotationLane lays out its rows (each row reserves
 * `max(row.avCount, avPerRow) * aavartanaSec` of horizontal time).
 * When `contentRowTimings` is set, rows are positioned absolutely at
 * those marked starts (matches the lanes' section-cue behaviour).
 */
export default function AvartanaBoundaryOverlay({
    contentRows,
    contentRowTimings,
    avPerRow = 1,
    aavartanaSec,
    timeRef,
    playheadFraction = 0.25,
    pxPerSec,
    zoom,
    isDark = true,
}) {
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const pxPerSecRef = useRef(pxPerSec);
    const zoomRef = useRef(zoom);

    useEffect(() => {
        pxPerSecRef.current = pxPerSec;
        zoomRef.current = zoom;
    }, [pxPerSec, zoom]);

    const hasTimings = !!(contentRowTimings && contentRows && contentRowTimings.length === contentRows.length);

    // End-time of every āvartana in seconds, mirroring NotationLane row math.
    const boundaryTimes = useMemo(() => {
        if (!contentRows?.length) return [];
        const times = [];
        let cursor = 0; // running time when no per-row timings are set
        for (let r = 0; r < contentRows.length; r++) {
            const row = contentRows[r];
            const realAv = Math.max(1, row.avCount || 1);
            // Same formula NotationLane uses to compute row width.
            const slotAv = Math.max(realAv, avPerRow || 1);
            const rowStart = hasTimings ? contentRowTimings[r] : cursor;
            // One line per actual āvartana inside the row (not per padded slot).
            for (let j = 1; j <= realAv; j++) {
                times.push(rowStart + j * aavartanaSec);
            }
            cursor = rowStart + slotAv * aavartanaSec;
        }
        return times;
    }, [contentRows, contentRowTimings, hasTimings, avPerRow, aavartanaSec]);

    // Smooth scroll via rAF, reading time from the shared ref.
    useEffect(() => {
        const animate = () => {
            const el = containerRef.current;
            if (el && timeRef) {
                const t = timeRef.current || 0;
                const offset = t * pxPerSecRef.current * zoomRef.current;
                el.style.transform = `translateX(-${offset}px)`;
            }
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [timeRef]);

    if (!boundaryTimes.length) return null;

    const lineColor = isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(180, 83, 9, 0.55)';
    const glowColor = isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(180, 83, 9, 0.12)';

    return (
        <div
            className="absolute inset-y-0 pointer-events-none overflow-hidden"
            style={{
                left: `${playheadFraction * 100}%`,
                right: 0,
                zIndex: 15,
            }}
        >
            {/* Scroll wrapper — origin (left:0) sits at the playhead. The
                outer clipping div starts at the playhead too, so any
                boundary whose effective position scrolls negative (past the
                playhead, into the played region) is hidden by overflow. */}
            <div
                ref={containerRef}
                className="absolute top-0 bottom-0"
                style={{
                    left: 0,
                    willChange: 'transform',
                }}
            >
                {boundaryTimes.map((t, i) => {
                    const left = t * pxPerSec * zoom;
                    return (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0"
                            style={{
                                left,
                                width: 2,
                                background: lineColor,
                                boxShadow: `0 0 6px ${glowColor}`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
