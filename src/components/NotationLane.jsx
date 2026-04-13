import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Copy, X } from 'lucide-react';

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
    contentRowTimings,
    editMode = false,
    onTokenEdit,
    timeRef,
    textMode = false,
    contentRows,
    avPerRow = 1,
    pxPerSec = 100,
    zoom = 2,
    onZoomChange,
    onPan,
    onRowDuplicate,
    onRowDelete,
    canEdit = true,
}) {
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const aavartanaSecRef = useRef(aavartanaSec);
    const pxPerSecRef = useRef(pxPerSec);
    const zoomRef = useRef(zoom);
    const [editingKey, setEditingKey] = useState(null); // `${avIdx}-${tIdx}`

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { aavartanaSecRef.current = aavartanaSec; }, [aavartanaSec]);
    useEffect(() => { pxPerSecRef.current = pxPerSec; zoomRef.current = zoom; }, [pxPerSec, zoom]);

    // Wheel-to-zoom and trackpad-swipe-to-pan are wired on the Song Track
    // Zone <main> in EditorSongView, not here. The parent handler covers
    // every track + the empty space around them, so this lane just renders.

    // Each avartana covers exactly aavartanaSec * pxPerSec pixels.
    const effectiveAvPx = aavartanaSec * pxPerSec * zoom;

    // When aavartanaTimings provided, columns are absolutely positioned at
    // timing[i] * pxPerSec * zoom. The transform scroll is the same formula
    // (t * pxPerSec * zoom), so column i aligns with playhead when t=timing[i].
    const hasTimings = !textMode && !!(aavartanaTimings && aavartanaTimings.length === aavartanas?.length);

    // Same idea for text mode, but at content-row granularity. When provided,
    // text rows are positioned absolutely so user-set section cues realign the
    // visible swara/sahitya rows on the timeline.
    const hasTextTimings = textMode && !!(contentRowTimings && contentRows && contentRowTimings.length === contentRows.length);

    // Section bands — one wide header per contiguous run of rows belonging
    // to the same section. Computed in both layout modes (absolute timings
    // OR cumulative flex) so the band always matches the rows underneath.
    const sectionBands = useMemo(() => {
        if (!textMode || !contentRows?.length) return [];
        const bands = [];
        let cursorPx = 0;
        let i = 0;
        while (i < contentRows.length) {
            const sec = contentRows[i].section;
            const startPx = hasTextTimings
                ? (contentRowTimings[i] || 0) * pxPerSec * zoom
                : cursorPx;
            let endPx = startPx;
            while (i < contentRows.length && contentRows[i].section === sec) {
                const realAv = Math.max(1, contentRows[i].avCount || 1);
                const slotAv = Math.max(realAv, avPerRow || 1);
                const rowW = slotAv * effectiveAvPx;
                const rowLeft = hasTextTimings
                    ? (contentRowTimings[i] || 0) * pxPerSec * zoom
                    : cursorPx;
                endPx = rowLeft + rowW;
                cursorPx = rowLeft + rowW;
                i++;
            }
            bands.push({ section: sec, left: startPx, width: Math.max(1, endPx - startPx) });
        }
        return bands;
    }, [textMode, contentRows, contentRowTimings, hasTextTimings, avPerRow, effectiveAvPx, pxPerSec, zoom]);

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
        // When section cues are set, position rows absolutely by their start
        // time. Otherwise fall back to the original flex layout (uniform spacing).
        const containerStyle = hasTextTimings
            ? {
                left: `${playheadFraction * 100}%`,
                willChange: 'transform',
                width: Math.max(1, (totalDuration * pxPerSec * zoom) + effectiveAvPx),
            }
            : {
                left: `${playheadFraction * 100}%`,
                willChange: 'transform',
                paddingRight: '60vw',
            };

        return (
            <div className="relative w-full h-full overflow-hidden no-scrollbar">
                <div
                    ref={containerRef}
                    className={`absolute top-0 h-full ${hasTextTimings ? '' : 'flex items-center'}`}
                    style={containerStyle}
                >
                    {/* Section header bands — span the full horizontal extent
                        of each section, with the section name repeated like a
                        marquee so the label is visible regardless of pan/zoom. */}
                    {sectionBands.map((band, bi) => {
                        // Marquee spacing: tile the label every ~220px so wide
                        // sections show many copies and short ones still show
                        // at least one centered.
                        const TILE_PX = 220;
                        const repeatCount = Math.max(1, Math.round(band.width / TILE_PX));
                        return (
                            <div
                                key={`band-${bi}`}
                                className="absolute top-1 flex items-center text-[11px] font-black tracking-widest uppercase z-20 pointer-events-none rounded overflow-hidden"
                                style={{
                                    left: band.left,
                                    width: band.width,
                                    height: 18,
                                    color: isDark ? '#10b981' : '#047857',
                                    background: isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.10)',
                                    border: `1px solid ${isDark ? 'rgba(16,185,129,0.30)' : 'rgba(4,120,87,0.25)'}`,
                                    backdropFilter: 'blur(8px)',
                                    justifyContent: repeatCount > 1 ? 'space-around' : 'center',
                                }}
                            >
                                {Array.from({ length: repeatCount }).map((_, i) => (
                                    <span key={i} className="px-2 whitespace-nowrap">
                                        {band.section}
                                    </span>
                                ))}
                            </div>
                        );
                    })}

                    {contentRows.map((row, idx) => {
                        // Row width is driven by `avPerRow` (the user's
                        // layout density choice in the lyrics editor) so
                        // every row spans `avPerRow × calibrationSec` of
                        // visual space. If a row's source data happens to
                        // contain more avartanas than that, we expand to
                        // fit so we never lose content.
                        const avCount = Math.max(row.avCount || 1, avPerRow || 1);
                        const w = avCount * effectiveAvPx;

                        // Tokenize this lane's own string independently. The
                        // row is one flex line of width `w`, with the tokens
                        // spread across it via `justify-content: space-between`.
                        // No cells, no fixed slot widths — each token takes its
                        // natural size and the gaps stretch to fill the row.
                        const rawStr = (isSwara ? row.swara : row.sahitya) || '';
                        const tokens = rawStr.split(/\s+/).filter(Boolean);

                        // Font size scales with the row width per token so the
                        // text grows when there's more space and shrinks when
                        // it's tight. Capped to a sane min/max range.
                        const tokenCount = Math.max(1, tokens.length);
                        const fontPx = Math.max(10, Math.min(24, (w / tokenCount) / (isSwara ? 10 : 9) * 12));
                        const finalFontSize = `${fontPx}px`;

                        const rowLeft = hasTextTimings
                            ? contentRowTimings[idx] * pxPerSec * zoom
                            : undefined;

                        return (
                            <div
                                key={idx}
                                className="flex-shrink-0 flex items-center h-full relative"
                                style={{
                                    width: w,
                                    justifyContent: 'space-between',
                                    ...(hasTextTimings ? { position: 'absolute', top: 0, bottom: 0, left: rowLeft } : null),
                                }}
                            >
                                {canEdit && (onRowDuplicate || onRowDelete) && (
                                    <div
                                        className="absolute bottom-1 right-1 flex items-center gap-1 z-30"
                                        // Pointer-events isolated so the parent's drag/seek
                                        // handlers don't see clicks aimed at the icons.
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                    >
                                        {onRowDuplicate && (
                                            <button
                                                type="button"
                                                title="Duplicate this line"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRowDuplicate(idx);
                                                }}
                                                className="flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110 active:scale-95"
                                                style={{
                                                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)',
                                                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                                    backdropFilter: 'blur(8px)',
                                                }}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        )}
                                        {onRowDelete && (
                                            <button
                                                type="button"
                                                title="Delete this line"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('Delete this line?')) onRowDelete(idx);
                                                }}
                                                className="flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110 active:scale-95"
                                                style={{
                                                    color: isDark ? 'rgba(248,113,113,0.95)' : 'rgba(185,28,28,0.85)',
                                                    background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                                                    border: `1px solid ${isDark ? 'rgba(239,68,68,0.35)' : 'rgba(185,28,28,0.25)'}`,
                                                    backdropFilter: 'blur(8px)',
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {tokens.map((tok, i) => {
                                    // Avartana boundaries (||) are now drawn as a
                                    // cross-lane vertical line by AvartanaBoundaryOverlay,
                                    // so we drop the inline text marker entirely.
                                    if (tok === '||') return null;
                                    if (tok === '|') {
                                        return (
                                            <span
                                                key={i}
                                                className="font-bold opacity-40 select-none flex-shrink-0"
                                                style={{
                                                    fontSize: '1.2rem',
                                                    color: isDark ? '#fff' : '#000',
                                                }}
                                            >
                                                {tok}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span
                                            key={i}
                                            className="font-bold select-none flex-shrink-0"
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
                                            {tok === '-' ? <span style={{ opacity: 0.3 }}>—</span> : tok}
                                        </span>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Past-side mask — solid background covering everything to
                    the left of the playhead so tokens that scroll across the
                    playhead are HIDDEN, not faded. */}
                <div
                    className="absolute inset-y-0 left-0 pointer-events-none z-10"
                    style={{
                        width: `${playheadFraction * 100}%`,
                        background: isDark ? '#0a0a0f' : '#f8fafc',
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
        <div className="relative w-full h-full overflow-hidden no-scrollbar">
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
                                    className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-amber-500/15 text-[11px] font-black tracking-widest uppercase whitespace-nowrap z-20"
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
                                const isEditing = canEdit && editMode && editingKey === editKey;

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
                                                cursor: canEdit && editMode ? 'text' : 'default',
                                                outline: canEdit && editMode && !isEditing ? '1px dashed rgba(255,255,255,0.12)' : 'none',
                                                borderRadius: 4,
                                                padding: canEdit && editMode ? '2px 4px' : 0,
                                                background: canEdit && editMode && !isEditing ? 'rgba(255,255,255,0.03)' : 'transparent',
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
