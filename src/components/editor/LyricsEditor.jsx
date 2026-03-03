import React, { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';

// ── Tala definitions ────────────────────────────────────────────────────────
const TALAS = [
    { id: 'adi',           label: 'Adi Tala',          beats: 8, angas: [4, 2, 2] },
    { id: 'rupaka',        label: 'Rupaka Tala',        beats: 6, angas: [2, 2, 2] },
    { id: 'misra_chapu',   label: 'Misra Chapu',        beats: 7, angas: [3, 2, 2] },
    { id: 'khanda_chapu',  label: 'Khanda Chapu',       beats: 5, angas: [2, 3]   },
    { id: 'khanda_triputa',label: 'Khanda Triputa',     beats: 9, angas: [5, 2, 2] },
    { id: 'tisra_triputa', label: 'Tisra Triputa',      beats: 7, angas: [3, 2, 2] },
    { id: 'chatusra_eka',  label: 'Chatusra Eka',       beats: 4, angas: [4]       },
    { id: 'tisra_eka',     label: 'Tisra Eka',          beats: 3, angas: [3]       },
    { id: 'sankeerna_eka', label: 'Sankeerna Eka',      beats: 9, angas: [9]       },
];

// ── Swara colours (matches NotationLane) ─────────────────────────────────────
const SWARA_COLORS = {
    S: '#34d399', R: '#60a5fa', G: '#a78bfa',
    M: '#fbbf24', P: '#f87171', D: '#fb923c', N: '#e879f9',
};
function swaraColor(text) {
    return SWARA_COLORS[text?.trim()?.[0]?.toUpperCase()] || '#10b981';
}

// ── Beat-group parsing ───────────────────────────────────────────────────────
// Each content entry = one aavartana. Beats are separated by |; || marks aavartana end.
function parseBeatGroups(str) {
    if (!str?.trim()) return [''];
    const groups = str
        .replace(/\|\|/g, '')       // strip aavartana-end marker (implicit in data structure)
        .split('|')
        .map(g => g.trim());
    // Drop trailing empty entry left by a trailing |
    while (groups.length > 1 && groups[groups.length - 1] === '') groups.pop();
    return groups.length ? groups : [''];
}

function joinBeatGroups(groups) {
    return groups.filter(g => g !== undefined).join(' | ');
}

// ── LyricsEditor ─────────────────────────────────────────────────────────────
export default function LyricsEditor({ composition, onSave, onClose, theme, initialTalam = 'adi' }) {
    const [talam, setTalam] = useState(initialTalam);
    const [localComp, setLocalComp] = useState(() => structuredClone(composition));

    const isDark = theme !== 'light';
    const selectedTala = TALAS.find(t => t.id === talam) || TALAS[0];

    // 0-based beat indices BEFORE which we insert an anga separator
    const angaBreaks = useMemo(() => {
        const breaks = new Set();
        let sum = 0;
        for (const a of selectedTala.angas.slice(0, -1)) {
            sum += a;
            breaks.add(sum);
        }
        return breaks;
    }, [talam]);

    // ── Edit handlers ──────────────────────────────────────────────────────
    function handleChange(si, ci, field, bi, value) {
        setLocalComp(prev => {
            const next = structuredClone(prev);
            const entry = next[si].content[ci];
            const groups = parseBeatGroups(entry[field]);
            while (groups.length <= bi) groups.push('');
            groups[bi] = value;
            entry[field] = joinBeatGroups(groups);
            return next;
        });
    }

    function handleAddBeat(si, ci) {
        setLocalComp(prev => {
            const next = structuredClone(prev);
            const entry = next[si].content[ci];
            const sg = parseBeatGroups(entry.swaram);
            const lg = parseBeatGroups(entry.sahityam ?? '');
            sg.push('');
            lg.push('');
            entry.swaram   = joinBeatGroups(sg);
            entry.sahityam = joinBeatGroups(lg);
            return next;
        });
    }

    // ── Theme tokens ──────────────────────────────────────────────────────
    const bg          = isDark ? '#0d0d18' : '#f8fafc';
    const surfaceBg   = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';
    const border      = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const borderStrong= isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
    const textPrimary = isDark ? '#f0f0fa' : '#0f172a';
    const textMuted   = isDark ? 'rgba(240,240,250,0.4)' : 'rgba(15,23,42,0.4)';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
        >
            <div
                className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                style={{ maxWidth: '95vw', height: '92vh', background: bg, border: `1px solid ${borderStrong}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div
                    className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
                    style={{ borderBottom: `1px solid ${border}` }}
                >
                    <div className="flex-1">
                        <h2 className="text-base font-bold" style={{ color: textPrimary }}>Lyrics Editor</h2>
                        <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
                            Edit swara &amp; sahitya at beat level — each column is one beat group
                        </p>
                    </div>

                    {/* Talam picker */}
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
                            Talam
                        </span>
                        <select
                            value={talam}
                            onChange={e => setTalam(e.target.value)}
                            className="text-sm font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${borderStrong}`,
                                color: textPrimary,
                            }}
                        >
                            {TALAS.map(t => (
                                <option key={t.id} value={t.id}>{t.label} — {t.beats} beats</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: textMuted }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-10">
                    {localComp.map((section, si) => (
                        <div key={si}>
                            {/* Section heading */}
                            <div className="flex items-center gap-3 mb-5">
                                <span
                                    className="text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-lg flex-shrink-0"
                                    style={{
                                        background: 'rgba(251,191,36,0.13)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(251,191,36,0.28)',
                                    }}
                                >
                                    {section.section}
                                </span>
                                <div className="flex-1 h-px" style={{ background: border }} />
                                <span className="text-[10px] flex-shrink-0" style={{ color: textMuted }}>
                                    {section.content.length} āvartana{section.content.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Beat-number legend for this talam (shown once per section) */}
                            <BeatLegend tala={selectedTala} angaBreaks={angaBreaks} isDark={isDark} border={border} textMuted={textMuted} />

                            {/* Aavartana rows */}
                            <div className="space-y-3 mt-2">
                                {section.content.map((entry, ci) => {
                                    const sg = parseBeatGroups(entry.swaram);
                                    const lg = parseBeatGroups(entry.sahityam ?? '');
                                    const beatCount = Math.max(sg.length, lg.length, 1);

                                    return (
                                        <div key={ci} className="flex items-stretch gap-3">
                                            {/* Āvartana label */}
                                            <div
                                                className="flex-shrink-0 flex items-center justify-end"
                                                style={{ width: 40 }}
                                            >
                                                <span
                                                    className="text-[9px] font-mono font-bold rotate-0"
                                                    style={{ color: textMuted }}
                                                >
                                                    Āv{ci + 1}
                                                </span>
                                            </div>

                                            {/* Beat cells */}
                                            <div className="flex flex-wrap items-stretch gap-1">
                                                {Array.from({ length: beatCount }, (_, bi) => {
                                                    const beatNum = (bi % selectedTala.beats) + 1;
                                                    const isAngaBreak = angaBreaks.has(bi);

                                                    return (
                                                        <React.Fragment key={bi}>
                                                            {/* Anga divider */}
                                                            {isAngaBreak && (
                                                                <div
                                                                    className="self-stretch flex items-center"
                                                                    style={{ width: 10 }}
                                                                >
                                                                    <div
                                                                        className="w-px h-full mx-auto"
                                                                        style={{ background: borderStrong }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Beat cell */}
                                                            <BeatCell
                                                                beatNum={beatNum}
                                                                isFirst={beatNum === 1}
                                                                swaraText={sg[bi] ?? ''}
                                                                sahText={lg[bi] ?? ''}
                                                                onSwaraChange={v => handleChange(si, ci, 'swaram', bi, v)}
                                                                onSahChange={v => handleChange(si, ci, 'sahityam', bi, v)}
                                                                isDark={isDark}
                                                                border={border}
                                                                textMuted={textMuted}
                                                            />
                                                        </React.Fragment>
                                                    );
                                                })}

                                                {/* Add beat */}
                                                <button
                                                    onClick={() => handleAddBeat(si, ci)}
                                                    className="self-stretch flex items-center justify-center rounded-lg transition-all hover:opacity-90"
                                                    style={{
                                                        width: 28,
                                                        background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.06)',
                                                        border: '1px dashed rgba(16,185,129,0.35)',
                                                        color: '#10b981',
                                                    }}
                                                    title="Add beat group"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                    style={{ borderTop: `1px solid ${border}` }}
                >
                    <div className="flex items-center gap-2 text-xs" style={{ color: textMuted }}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>
                            <strong style={{ color: textPrimary }}>{selectedTala.label}</strong>
                            {' · '}{selectedTala.beats} beats
                            {' · '}Angas: {selectedTala.angas.join(' + ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                            style={{ background: surfaceBg, border: `1px solid ${border}`, color: textMuted }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onSave(localComp); onClose(); }}
                            className="px-5 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Beat legend row (shown once at section top) ───────────────────────────────
function BeatLegend({ tala, angaBreaks, isDark, border, textMuted }) {
    return (
        <div className="flex items-center gap-1 mb-1 pl-[52px]">
            {Array.from({ length: tala.beats }, (_, bi) => (
                <React.Fragment key={bi}>
                    {angaBreaks.has(bi) && <div style={{ width: 10 }} />}
                    <div
                        className="flex items-center justify-center rounded text-[9px] font-bold"
                        style={{
                            width: 76,
                            height: 18,
                            background: bi === 0
                                ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)')
                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                            border: `1px solid ${bi === 0 ? 'rgba(16,185,129,0.3)' : border}`,
                            color: bi === 0 ? '#10b981' : textMuted,
                        }}
                    >
                        {bi + 1}
                    </div>
                </React.Fragment>
            ))}
            {/* spacer for + button */}
            <div style={{ width: 28 }} />
        </div>
    );
}

// ── Individual beat cell ───────────────────────────────────────────────────────
function BeatCell({ beatNum, isFirst, swaraText, sahText, onSwaraChange, onSahChange, isDark, border, textMuted }) {
    const color  = swaraText ? swaraColor(swaraText) : (isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)');
    const sahCol = sahText   ? (isDark ? '#fcd34d' : '#92400e') : (isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)');

    return (
        <div
            className="flex flex-col rounded-xl overflow-hidden flex-shrink-0"
            style={{
                width: 76,
                background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
                border: `1px solid ${isFirst ? 'rgba(16,185,129,0.25)' : border}`,
            }}
        >
            {/* Swara */}
            <input
                value={swaraText}
                onChange={e => onSwaraChange(e.target.value)}
                placeholder="—"
                spellCheck={false}
                className="w-full text-center bg-transparent outline-none font-bold"
                style={{
                    padding: '7px 4px 5px',
                    fontSize: '0.95rem',
                    fontFamily: "'Outfit', sans-serif",
                    color,
                    borderBottom: `1px solid ${border}`,
                }}
            />
            {/* Sahitya */}
            <input
                value={sahText}
                onChange={e => onSahChange(e.target.value)}
                placeholder="—"
                spellCheck={false}
                className="w-full text-center bg-transparent outline-none"
                style={{
                    padding: '5px 4px 7px',
                    fontSize: '0.82rem',
                    fontFamily: "'Outfit', sans-serif",
                    color: sahCol,
                }}
            />
        </div>
    );
}
