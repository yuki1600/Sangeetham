import React, { useState, useEffect, useRef } from 'react';

// Note: AAVARTANA_PX is now dynamically calculated as pxPerSec * aavartanaSec * zoom

const SWARA_COLORS = {
    S: '#34d399',
    R: '#60a5fa',
    G: '#a78bfa',
    M: '#fbbf24',
    P: '#f87171',
    D: '#fb923c',
    N: '#e879f9',
};

function swaraColor(text, theme) {
    if (theme === 'light') return '#000000';
    const first = text[0]?.toUpperCase();
    return SWARA_COLORS[first] || '#e8e8f0';
}

/**
 * Scrolling notation lane for swara or sahitya display.
 *
 * Props:
 *   aavartanas      - flat array from buildAavartanas()
 *   currentTime     - current playback position in seconds
 *   totalDuration   - total audio duration
 *   playheadFraction - 0..1, default 0.25
 *   type            - 'swara' | 'sahitya'
 *   theme           - 'dark' | 'light'
 *   aavartanaSec     - seconds per aavartana (default 3.3, variable in editor)
 *   aavartanaTimings - optional array of start-time (s) per aavartana; when
 *                      provided columns are absolutely positioned so each section
 *                      reaches the playhead at its marked time
 *   editMode         - boolean: enables click-to-edit on tokens
 *   onTokenEdit      - (avIdx, tokIdx, field, newText) => void
 *   timeRef          - optional ref for high-frequency time updates
 *   textMode         - boolean: render full text rows instead of parsed tokens
 *   contentRows      - flat array from buildContentRows() (used when textMode=true)
 *   avPerRow         - avartanas per content row (1 or 2), controls width in text mode
 */
export default function NotationLane({
    aavartanas,
    currentTime,
    totalDuration,
    playheadFraction = 0.25,
    type = 'swara',
    theme,
    aavartanaSec = 4.0,
    aavartanaTimings,
    editMode = false,
    onTokenEdit,
    timeRef,
    textMode = false,
    contentRows,
    avPerRow = 1,
    pxPerSec = 100,
    zoom = 2,
    onZoomChange,
}) {
    const containerRef = useRef(null);
    const wheelTargetRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const aavartanaSecRef = useRef(aavartanaSec);
    const pxPerSecRef = useRef(pxPerSec);
    const zoomRef = useRef(zoom);
    const onZoomChangeRef = useRef(onZoomChange);
    const [editingKey, setEditingKey] = useState(null); // `${avIdx}-${tIdx}`

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { aavartanaSecRef.current = aavartanaSec; }, [aavartanaSec]);
    useEffect(() => { pxPerSecRef.current = pxPerSec; zoomRef.current = zoom; }, [pxPerSec, zoom]);
    useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

    // Scroll-to-zoom: forward wheel events to parent zoom state, mirroring
    // WaveformEditor's behaviour so the user can zoom from any lane.
    useEffect(() => {
        const el = wheelTargetRef.current;
        if (!el) return;
        const MIN_ZOOM = 0.1;
        const MAX_ZOOM = 10;
        const handleWheel = (e) => {
            if (!onZoomChangeRef.current) return;
            e.preventDefault();
            const factor = -e.deltaY > 0 ? 1.15 : 1 / 1.15;
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
            onZoomChangeRef.current(next);
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Each avartana covers exactly aavartanaSec * pxPerSec pixels.
    const effectiveAvPx = aavartanaSec * pxPerSec * zoom;

    // When aavartanaTimings provided, columns are absolutely positioned at
    // timing[i] * pxPerSec * zoom. The transform scroll is the same formula
    // (t * pxPerSec * zoom), so column i aligns with playhead when t=timing[i].
    const hasTimings = !textMode && !!(aavartanaTimings && aavartanaTimings.length === aavartanas?.length);

    // In text mode, each row occupies avPerRow avartanas worth of pixels
    const rowPx = avPerRow * effectiveAvPx;

    // Animate scroll
    useEffect(() => {
        const animate = () => {
            const el = containerRef.current;
            if (el) {
                const t = timeRef ? timeRef.current : currentTimeRef.current;
                const offset = t * pxPerSecRef.current * zoomRef.current;
                el.style.transform = `translateX(-${offset}px)`;
            }
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const isSwara = type === 'swara';
    const isDark = theme !== 'light';

    // ── Text mode: render full text rows ──────────────────────────────────
    if (textMode && contentRows) {
        return (
            <div ref={wheelTargetRef} className="relative w-full h-full overflow-hidden no-scrollbar">
                <div
                    ref={containerRef}
                    className="absolute top-0 h-full flex items-center"
                    style={{
                        left: `${playheadFraction * 100}%`,
                        willChange: 'transform',
                        paddingRight: '60vw',
                    }}
                >
                    {contentRows.map((row, idx) => {
                        const text = (isSwara ? row.swara : row.sahitya) || '';
                        const isFirstInSection = idx === 0 || contentRows[idx - 1]?.section !== row.section;
                        const avCount = row.avCount || 1;
                        const w = avCount * effectiveAvPx;

                        // Text fitting: calculate a font size that fills the width 'w'
                        // Base: ~10px per character for 1rem.
                        // We want: fontSize * text.length * density ~ w
                        const baseCharWidth = isSwara ? 11 : 9;
                        const targetW = w - 48; // padding
                        const autoFontSize = Math.min(1.8, targetW / (text.length * baseCharWidth));
                        const finalFontSize = `${autoFontSize}rem`;

                        return (
                            <div
                                key={idx}
                                className="flex-shrink-0 flex items-center h-full relative"
                                style={{ width: w }}
                            >
                                {isFirstInSection && (
                                    <div
                                        className="absolute top-2 left-0 px-2 py-0.5 rounded bg-emerald-500/15 text-[11px] font-black tracking-widest uppercase z-20"
                                        style={{
                                            color: isDark ? '#10b981' : '#047857',
                                            border: `1px solid ${isDark ? 'rgba(16,185,129,0.35)' : 'rgba(4,120,87,0.25)'}`,
                                            backdropFilter: 'blur(8px)'
                                        }}
                                    >
                                        {row.section}
                                    </div>
                                )}

                                <div
                                    className="w-full px-5 flex justify-between items-center"
                                    style={{
                                        fontSize: finalFontSize,
                                        fontFamily: "'Outfit', sans-serif",
                                        fontWeight: 700,
                                        color: isSwara
                                            ? (isDark ? '#60a5fa' : '#1e40af')
                                            : (isDark ? '#fcd34d' : '#b45309'),
                                        whiteSpace: 'nowrap',
                                        textShadow: isSwara && isDark ? '0 0 12px rgba(96,165,250,0.25)' : 'none',
                                    }}
                                >
                                    {text.split(/(\s+)/).map((chunk, i) => (
                                        <span key={i} style={{ display: 'inline-block' }}>
                                            {chunk.replace(/ /g, '\u00A0')}
                                        </span>
                                    ))}
                                </div>

                                <div
                                    className="absolute right-0 top-0 bottom-0 w-px"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div
                    className="absolute inset-y-0 left-0 pointer-events-none z-10"
                    style={{
                        width: `${playheadFraction * 100}%`,
                        background: `linear-gradient(to right, ${isDark ? '#0a0a0f' : '#f8fafc'}, transparent)`,
                    }}
                />
                <div
                    className="absolute inset-y-0 right-0 pointer-events-none z-10"
                    style={{
                        width: '15%',
                        background: `linear-gradient(to left, ${isDark ? '#0a0a0f' : '#f8fafc'}, transparent)`,
                    }}
                />
            </div>
        );
    }

    // ── Token mode: original per-avartana parsed token rendering ──────────
    return (
        <div ref={wheelTargetRef} className="relative w-full h-full overflow-hidden no-scrollbar">
            <div
                ref={containerRef}
                className="absolute top-0 h-full"
                style={{
                    left: `${playheadFraction * 100}%`,
                    willChange: 'transform',
                    ...(hasTimings
                        ? { width: Math.max(1, (totalDuration * pxPerSec * zoom) + effectiveAvPx) }
                        : { display: 'flex', alignItems: 'center', paddingRight: '60vw' }
                    ),
                }}
            >
                {aavartanas.map((av, avIdx) => {
                    const tokens = isSwara ? av.swara : av.sahitya;
                    const noteCount = tokens.filter(t => !t.isSeparator).length || 1;
                    const noteWidth = effectiveAvPx / noteCount;
                    const noteFontSize = `${Math.min(isSwara ? 1.5 : 1.2, noteWidth / 16)}rem`;

                    const colLeft = hasTimings
                        ? aavartanaTimings[avIdx] * pxPerSec * zoom
                        : undefined;

                    return (
                        <div
                            key={avIdx}
                            className="flex items-center h-full flex-shrink-0"
                            style={{
                                width: effectiveAvPx,
                                ...(hasTimings ? { position: 'absolute', top: 0, bottom: 0, left: colLeft } : { position: 'relative' }),
                            }}
                        >
                            {(avIdx === 0 || aavartanas[avIdx - 1]?.section !== av.section) && (
                                <div
                                    className="absolute top-2 left-0 px-2 py-0.5 rounded bg-amber-500/15 text-[11px] font-black tracking-widest uppercase"
                                    style={{
                                        color: isDark ? '#fbbf24' : '#92400e',
                                        border: `1px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(146,64,14,0.25)'}`
                                    }}
                                >
                                    {av.section}
                                </div>
                            )}

                            {/* Tokens */}
                            {tokens.map((tok, tIdx) => {
                                if (tok.isSeparator) {
                                    return (
                                        <div
                                            key={tIdx}
                                            className="flex-shrink-0 flex items-center justify-center relative h-full z-20"
                                            style={{ width: 0 }}
                                        >
                                            <span
                                                className="absolute font-bold opacity-40 ml-1"
                                                style={{ fontSize: '1.2rem', color: isDark ? '#fff' : '#000' }}
                                            >
                                                {tok.text}
                                            </span>
                                        </div>
                                    );
                                }

                                const color = isSwara ? swaraColor(tok.text, theme) : (theme === 'light' ? '#000000' : '#fcd34d');
                                const editKey = `${avIdx}-${tIdx}`;
                                const isEditing = editMode && editingKey === editKey;

                                return (
                                    <div
                                        key={tIdx}
                                        className="flex-shrink-0 flex items-center justify-center h-full"
                                        style={{ width: noteWidth, minWidth: 0, overflow: 'hidden' }}
                                        onClick={editMode && !isEditing ? (e) => {
                                            e.stopPropagation();
                                            setEditingKey(editKey);
                                        } : undefined}
                                    >
                                        <div
                                            className="relative flex flex-col items-center"
                                            style={{
                                                cursor: editMode ? 'text' : 'default',
                                                outline: editMode && !isEditing ? '1px dashed rgba(255,255,255,0.12)' : 'none',
                                                borderRadius: 4,
                                                padding: editMode ? '2px 4px' : 0,
                                                background: editMode && !isEditing ? 'rgba(255,255,255,0.03)' : 'transparent',
                                            }}
                                        >
                                            {isSwara && tok.octave === 'higher' && (
                                                <div
                                                    className="absolute -top-2 w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            )}

                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    defaultValue={tok.text}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => {
                                                        const val = e.target.value.trim();
                                                        if (val && val !== tok.text && onTokenEdit) {
                                                            onTokenEdit(avIdx, tIdx, type, val);
                                                        }
                                                        setEditingKey(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.target.blur();
                                                        if (e.key === 'Escape') { e.target.value = tok.text; setEditingKey(null); }
                                                        e.stopPropagation();
                                                    }}
                                                    style={{
                                                        width: Math.max(40, noteWidth - 8),
                                                        textAlign: 'center',
                                                        fontSize: noteFontSize,
                                                        fontFamily: "'Outfit', sans-serif",
                                                        color,
                                                        background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)',
                                                        border: `1px solid ${color}88`,
                                                        borderRadius: 6,
                                                        outline: 'none',
                                                        padding: '2px 4px',
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className="font-bold select-none leading-none text-center px-1"
                                                    style={{
                                                        fontSize: noteFontSize,
                                                        fontFamily: "'Outfit', sans-serif",
                                                        color,
                                                        textShadow: isSwara && isDark
                                                            ? `0 0 12px ${color}66`
                                                            : 'none',
                                                        letterSpacing: isSwara ? '0.05em' : '0.02em',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {tok.text === '-' ? (
                                                        <span style={{ opacity: 0.3 }}>—</span>
                                                    ) : tok.text}
                                                </span>
                                            )}

                                            {isSwara && tok.octave === 'lower' && (
                                                <div
                                                    className="absolute -bottom-2 w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Left fade overlay */}
            <div
                className="absolute inset-y-0 left-0 pointer-events-none z-10"
                style={{
                    width: `${playheadFraction * 100}%`,
                    background: `linear-gradient(to right, ${isDark ? '#0a0a0f' : '#f8fafc'}, transparent)`,
                }}
            />

            {/* Right fade overlay */}
            <div
                className="absolute inset-y-0 right-0 pointer-events-none z-10"
                style={{
                    width: '15%',
                    background: `linear-gradient(to left, ${isDark ? '#0a0a0f' : '#f8fafc'}, transparent)`,
                }}
            />
        </div>
    );
}
