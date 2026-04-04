import React, { useState, useEffect, useRef } from 'react';

const AAVARTANA_PX = 320;

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
 */
export default function NotationLane({
    aavartanas,
    currentTime,
    totalDuration,
    playheadFraction = 0.25,
    type = 'swara',
    theme,
    aavartanaSec = 3.3,
    aavartanaTimings,
    editMode = false,
    onTokenEdit,
    timeRef
}) {
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const aavartanaSecRef = useRef(aavartanaSec);
    const [editingKey, setEditingKey] = useState(null); // `${avIdx}-${tIdx}`

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { aavartanaSecRef.current = aavartanaSec; }, [aavartanaSec]);

    // When aavartanaTimings provided, columns are absolutely positioned at
    // timing[i]/avSec * AAVARTANA_PX. The transform scroll is the same formula
    // (t/avSec)*AAVARTANA_PX, so column i aligns with playhead when t=timing[i].
    const hasTimings = !!(aavartanaTimings && aavartanaTimings.length === aavartanas.length);

    // Animate scroll
    useEffect(() => {
        const animate = () => {
            const el = containerRef.current;
            if (el) {
                const t = timeRef ? timeRef.current : currentTimeRef.current;
                const offset = (t / aavartanaSecRef.current) * AAVARTANA_PX;
                el.style.transform = `translateX(-${offset}px)`;
            }
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const isSwara = type === 'swara';
    const isDark = theme !== 'light';

    return (
        <div className="relative w-full h-full overflow-hidden no-scrollbar">
            {/* Scrolling content */}
            <div
                ref={containerRef}
                className="absolute top-0 h-full"
                style={{
                    left: `${playheadFraction * 100}%`,
                    willChange: 'transform',
                    // In timing mode the container must be wide enough to hold all columns
                    ...(hasTimings
                        ? { width: Math.max(1, (totalDuration / aavartanaSec) * AAVARTANA_PX + AAVARTANA_PX) }
                        : { display: 'flex', alignItems: 'center', paddingRight: '60vw' }
                    ),
                }}
            >
                {aavartanas.map((av, avIdx) => {
                    const tokens = isSwara ? av.swara : av.sahitya;
                    const noteCount = tokens.filter(t => !t.isSeparator).length || 1;
                    const noteWidth = AAVARTANA_PX / noteCount;
                    // Scale font to fit the allocated note width; cap at design maxima
                    const noteFontSize = `${Math.min(isSwara ? 1.5 : 1.2, noteWidth / 16)}rem`;

                    // When timings provided: pin column to its audio start-time position
                    const colLeft = hasTimings
                        ? (aavartanaTimings[avIdx] / aavartanaSec) * AAVARTANA_PX
                        : undefined;

                    return (
                        <div
                            key={avIdx}
                            className="flex items-center h-full flex-shrink-0"
                            style={{
                                width: AAVARTANA_PX,
                                ...(hasTimings ? { position: 'absolute', top: 0, bottom: 0, left: colLeft } : { position: 'relative' }),
                            }}
                        >
                            {/* Section label */}
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
