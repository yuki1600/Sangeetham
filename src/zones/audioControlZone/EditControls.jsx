import React, { useState, useRef, useEffect } from 'react';
import {
    LayoutGrid, Scissors, ZoomOut, ZoomIn, Gauge, Undo2, FileText,
    RefreshCw, History, Save, Check, AlertCircle,
} from 'lucide-react';
import { formatTime } from '../../utils/formatTime';

/**
 * SecondsInput — number input that lets the user freely type any value
 * (whole or decimal). Uses a local string buffer so React's controlled
 * value never fights typing in progress. Commits the parsed value on blur
 * or Enter; if the user leaves the field blank or with an invalid value
 * we revert to `defaultValue` (the auto-calculated āvartana length).
 */
function SecondsInput({ value, defaultValue, onCommit, className, style, title }) {
    const [buffer, setBuffer] = useState(() => String(value ?? defaultValue ?? ''));
    const focusedRef = useRef(false);

    // Mirror external value changes (e.g. calibration via waveform) when not focused.
    useEffect(() => {
        if (focusedRef.current) return;
        const next = value != null ? String(parseFloat(Number(value).toFixed(2))) : String(parseFloat(Number(defaultValue ?? 0).toFixed(2)));
        setBuffer(next);
    }, [value, defaultValue]);

    const commit = () => {
        const trimmed = buffer.trim();
        if (trimmed === '') {
            onCommit(null);
            setBuffer(String(parseFloat(Number(defaultValue ?? 0).toFixed(2))));
            return;
        }
        const v = parseFloat(trimmed);
        if (!Number.isFinite(v) || v <= 0) {
            onCommit(null);
            setBuffer(String(parseFloat(Number(defaultValue ?? 0).toFixed(2))));
            return;
        }
        onCommit(v);
        setBuffer(String(parseFloat(v.toFixed(2))));
    };

    return (
        <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={buffer}
            onFocus={() => { focusedRef.current = true; }}
            onChange={e => setBuffer(e.target.value)}
            onBlur={() => { focusedRef.current = false; commit(); }}
            onKeyDown={e => {
                if (e.key === 'Enter') { e.currentTarget.blur(); }
                else if (e.key === 'Escape') {
                    setBuffer(String(parseFloat(Number(value ?? defaultValue ?? 0).toFixed(2))));
                    e.currentTarget.blur();
                }
            }}
            className={className}
            style={style}
            title={title}
        />
    );
}

/**
 * Audio Control Zone → Edit Controls
 *
 * The edit toolbar row + the (conditionally rendered) Section Cues panel
 * that opens below it when the Sections button is active.
 *
 * Contents:
 *   • Sections button (opens Section Cues panel)
 *   • Trim button
 *   • Zoom controls (out / presets / in / slider)
 *   • Calibrate button + SecondsInput
 *   • Undo, Lyrics, Reset, History, Save
 *
 * Pure view over props. All state lives in the parent orchestrator.
 */
export default function EditControls({
    // zoom
    waveZoom,
    setWaveZoom,
    // mode (trim / calibrate / view)
    editorMode,
    setEditorMode,
    // sections panel
    showSections,
    setShowSections,
    uniqueSections,
    sectionTimings,
    setSectionTimings,
    currentSection,
    currentTime,
    // calibration
    customAavartanaSec,
    setCustomAavartanaSec,
    autoAavartanaSec,
    // edit ops
    editOpsHistory,
    handleUndoLastCut,
    handleResetAllEdits,
    // panels
    showLyrics,
    setShowLyrics,
    showHistory,
    setShowHistory,
    // save
    handleSave,
    isSaving,
    saveStatus,
    // theme
    isDark,
    borderColor,
}) {
    return (
        <>
            <div
                className="relative flex items-center justify-center gap-3 px-5 py-3 flex-shrink-0 mt-4"
                style={{
                    borderTop: `1px solid ${borderColor}`,
                    borderBottom: `1px solid ${showSections ? 'transparent' : borderColor}`,
                    background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                }}
            >
                {/* Sections */}
                <button
                    onClick={() => setShowSections(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all"
                    style={{
                        borderColor: showSections ? 'rgba(251,191,36,0.5)' : borderColor,
                        background: showSections ? 'rgba(251,191,36,0.1)' : 'transparent',
                        color: showSections ? '#fbbf24' : 'var(--text-muted)',
                    }}
                    title="Set section start times"
                >
                    <LayoutGrid className="w-4 h-4" />
                    Sections
                    <span className="text-[10px] opacity-60 tabular-nums ml-0.5">
                        {Object.keys(sectionTimings).length > 0 ? Object.keys(sectionTimings).length : ''}
                    </span>
                </button>

                {/* Trim */}
                <button
                    onClick={() => setEditorMode(m => m === 'trim' ? 'view' : 'trim')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ml-2"
                    style={{
                        borderColor: editorMode === 'trim' ? 'rgba(239,68,68,0.4)' : borderColor,
                        background: editorMode === 'trim' ? 'rgba(239,68,68,0.1)' : 'transparent',
                        color: editorMode === 'trim' ? '#ef4444' : 'var(--text-muted)',
                    }}
                    title="Toggle trim mode (T)"
                >
                    <Scissors className="w-4 h-4" />
                    Trim
                </button>

                {/* Zoom controls */}
                <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-xl border" style={{ borderColor }}>
                    <button
                        onClick={() => setWaveZoom(z => Math.max(0.5, z / 1.5))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
                        style={{ color: 'var(--text-muted)' }}
                        title="Zoom out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    {[1, 2, 5, 10].map(z => (
                        <button
                            key={z}
                            onClick={() => setWaveZoom(z)}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all"
                            style={{
                                background: Math.abs(waveZoom - z) < 0.05 ? 'rgba(16,185,129,0.8)' : 'transparent',
                                color: Math.abs(waveZoom - z) < 0.05 ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            {z}x
                        </button>
                    ))}
                    <button
                        onClick={() => setWaveZoom(z => Math.min(10, z * 1.5))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
                        style={{ color: 'var(--text-muted)' }}
                        title="Zoom in"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <input
                        type="range"
                        min={Math.log(0.1)}
                        max={Math.log(10)}
                        step={0.01}
                        value={Math.log(waveZoom)}
                        onChange={e => setWaveZoom(Math.exp(Number(e.target.value)))}
                        className="w-20 h-1 accent-emerald-500 ml-1"
                        style={{ cursor: 'pointer' }}
                    />
                </div>

                {/* Calibrate */}
                <button
                    onClick={() => setEditorMode(m => m === 'calibrate' ? 'view' : 'calibrate')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                    style={{
                        borderColor: editorMode === 'calibrate' ? 'rgba(59,130,246,0.4)' : customAavartanaSec ? 'rgba(59,130,246,0.25)' : borderColor,
                        background: editorMode === 'calibrate' ? 'rgba(59,130,246,0.1)' : customAavartanaSec ? 'rgba(59,130,246,0.06)' : 'transparent',
                        color: editorMode === 'calibrate' ? '#3b82f6' : customAavartanaSec ? '#60a5fa' : 'var(--text-muted)',
                    }}
                    title="Calibrate āvartana speed — select 1 āvartana on waveform (C)"
                >
                    <Gauge className="w-4 h-4" />
                    Calibrate
                </button>
                <SecondsInput
                    value={customAavartanaSec}
                    defaultValue={autoAavartanaSec}
                    onCommit={v => setCustomAavartanaSec(v)}
                    className="w-16 text-center px-1 py-1.5 rounded-lg border text-xs font-bold tabular-nums focus:outline-none focus:border-blue-500/50"
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderColor: customAavartanaSec ? 'rgba(59,130,246,0.4)' : borderColor,
                        color: customAavartanaSec ? '#60a5fa' : 'var(--text-primary)',
                    }}
                    title="Āvartana duration in seconds — edit directly to calibrate"
                />
                <span className="text-[10px] opacity-40 -ml-1">s</span>

                <div className="w-px h-6 mx-1" style={{ background: borderColor }} />

                {/* Undo */}
                <button
                    onClick={handleUndoLastCut}
                    disabled={editOpsHistory.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-30"
                    style={{ borderColor, color: 'var(--text-muted)' }}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-4 h-4" />
                    Undo
                </button>

                {/* Lyrics */}
                <button
                    onClick={() => setShowLyrics(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                    style={{
                        borderColor: showLyrics ? 'rgba(167,139,250,0.45)' : borderColor,
                        background: showLyrics ? 'rgba(167,139,250,0.1)' : 'transparent',
                        color: showLyrics ? '#a78bfa' : 'var(--text-muted)',
                    }}
                    title="Open lyrics & notation editor"
                >
                    <FileText className="w-4 h-4" />
                    Lyrics
                </button>

                {/* Reset */}
                <button
                    onClick={handleResetAllEdits}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                    style={{ borderColor, color: 'var(--text-muted)' }}
                    title="Reset all edits (R)"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                </button>

                <div className="w-px h-6 mx-1" style={{ background: borderColor }} />

                {/* History */}
                <button
                    onClick={() => setShowHistory(s => !s)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${showHistory ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ borderColor: showHistory ? undefined : borderColor, color: showHistory ? undefined : 'var(--text-muted)' }}
                    title="View Edit History"
                >
                    <History className="w-4 h-4" />
                    History
                </button>

                {/* Save */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{
                        background: saveStatus === 'ok' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                        color: saveStatus ? (saveStatus === 'ok' ? '#10b981' : '#ef4444') : '#fff',
                    }}
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : saveStatus === 'ok' ? (
                        <Check className="w-4 h-4" />
                    ) : saveStatus === 'error' ? (
                        <AlertCircle className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saveStatus === 'ok' ? 'Saved' : saveStatus === 'error' ? 'Failed' : 'Save'}
                </button>
            </div>

            {/* Section Cues Panel — opens below the toolbar when Sections is active */}
            {showSections && (
                <div style={{ borderBottom: `1px solid ${borderColor}`, background: isDark ? 'rgba(251,191,36,0.04)' : 'rgba(180,130,0,0.05)' }}>
                    <div className="flex items-center justify-center gap-1 px-5 py-3 overflow-x-auto custom-scrollbar">
                        {uniqueSections.map((section, si) => {
                            const t = sectionTimings[section];
                            const isCurrent = currentSection === section;
                            return (
                                <div key={section} className="flex items-center gap-2 flex-shrink-0">
                                    {si > 0 && <div className="w-px h-4 mx-1 opacity-20" style={{ background: 'currentColor' }} />}
                                    <span
                                        className="text-[11px] font-black uppercase tracking-widest"
                                        style={{ color: isCurrent ? '#fbbf24' : 'var(--text-primary)', minWidth: 70 }}
                                    >
                                        {section}
                                    </span>
                                    <span
                                        className="text-xs font-mono tabular-nums"
                                        style={{ color: t != null ? '#10b981' : 'var(--text-muted)', opacity: t != null ? 1 : 0.35, minWidth: 36 }}
                                    >
                                        {t != null ? formatTime(t) : '--:--'}
                                    </span>
                                    <button
                                        onClick={() => setSectionTimings(prev => ({ ...prev, [section]: currentTime }))}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-100"
                                        style={{ background: isCurrent ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}
                                        title={`Set ${section} start to current time (${formatTime(currentTime)})`}
                                    >
                                        {isCurrent ? '● Set' : 'Set'}
                                    </button>
                                    {t != null && (
                                        <button
                                            onClick={() => setSectionTimings(prev => { const n = { ...prev }; delete n[section]; return n; })}
                                            className="text-[10px] opacity-30 hover:opacity-70 px-1"
                                            title="Clear this cue"
                                        >✕</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
