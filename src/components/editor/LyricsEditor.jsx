import React, { useState } from 'react';
import { X, Check, Music, Plus, Trash2, GripVertical, Section, Copy } from 'lucide-react';

/**
 * LyricsEditor
 * Text-box based notation editor for Carnatic compositions.
 * Each row = 1 or 2 aavartanas (user toggleable), with free-form swara/sahitya text.
 * The avartana grouping determines scroll speed calculation in the player.
 */
export default function LyricsEditor({ composition, initialAvPerRow = 1, onSave, onClose, theme }) {
    const isDark = theme !== 'light';

    // Toggle: how many avartanas per row (affects scroll speed calc)
    const [avPerRow, setAvPerRow] = useState(initialAvPerRow);

    // Detect template-generated placeholder strings (only _ | || and whitespace)
    const isTemplatePlaceholder = (str) => /^[\s_|]*$/.test(str);

    /**
     * Parse the JSON composition into sections with text rows.
     * Each content entry becomes one row with its full swaram/sahityam text.
     * Template placeholders (e.g. "_ _ _ | _ _ | _ _ ||") are treated as empty.
     */
    const [sections, setSections] = useState(() => {
        if (!Array.isArray(composition)) return [];
        return composition.filter(s => s.section !== 'Aro/Avaro').map(s => ({
            name: s.section,
            rows: (s.content || []).map(entry => ({
                swaram: isTemplatePlaceholder(entry.swaram || '') ? '' : (entry.swaram || ''),
                sahityam: isTemplatePlaceholder(entry.sahityam || '') ? '' : (entry.sahityam || '')
            }))
        }));
    });

    const [dragged, setDragged] = useState(null);
    const [pendingDeleteIdx, setPendingDeleteIdx] = useState(null);
    const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

    const updateRow = (secIdx, rowIdx, field, value) => {
        setSections(prev => {
            const next = [...prev];
            const newRows = [...next[secIdx].rows];
            newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
            next[secIdx] = { ...next[secIdx], rows: newRows };
            return next;
        });
    };

    const addRow = (secIdx) => {
        setSections(prev => prev.map((s, idx) =>
            idx === secIdx
                ? { ...s, rows: [...s.rows, { swaram: '', sahityam: '' }] }
                : s
        ));
    };

    const addSection = (afterIdx) => {
        setSections(prev => {
            const next = [...prev];
            const newSection = {
                name: '',
                rows: [{ swaram: '', sahityam: '' }]
            };
            if (typeof afterIdx === 'number') {
                next.splice(afterIdx + 1, 0, newSection);
            } else {
                next.push(newSection);
            }
            return next;
        });
    };

    const removeSection = (secIdx) => {
        if (skipDeleteConfirm) {
            setSections(prev => prev.filter((_, i) => i !== secIdx));
            return;
        }
        setPendingDeleteIdx(secIdx);
    };

    const confirmRemoveSection = () => {
        if (pendingDeleteIdx !== null) {
            setSections(prev => prev.filter((_, i) => i !== pendingDeleteIdx));
            setPendingDeleteIdx(null);
        }
    };

    const renameSection = (secIdx, newName) => {
        setSections(prev => prev.map((s, idx) => idx === secIdx ? { ...s, name: newName } : s));
    };

    const moveRow = (fromSec, fromIdx, toSec, toIdx) => {
        setSections(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const item = next[fromSec].rows.splice(fromIdx, 1)[0];
            next[toSec].rows.splice(toIdx, 0, item);
            return next;
        });
    };

    const duplicateRow = (secIdx, rowIdx) => {
        setSections(prev => prev.map((s, idx) => {
            if (idx !== secIdx) return s;
            const newRows = [...s.rows];
            const copy = JSON.parse(JSON.stringify(newRows[rowIdx]));
            newRows.splice(rowIdx + 1, 0, copy);
            return { ...s, rows: newRows };
        }));
    };

    const removeRow = (secIdx, rowIdx) => {
        setSections(prev => prev.map((s, idx) => {
            if (idx !== secIdx) return s;
            if (s.rows.length <= 1) return s;
            return { ...s, rows: s.rows.filter((_, i) => i !== rowIdx) };
        }));
    };

    /**
     * Serialize back to composition JSON.
     * Each text row becomes one content entry with swaram/sahityam strings.
     */
    const handleSave = () => {
        const newComposition = sections.map(s => ({
            section: s.name,
            content: s.rows.map(row => ({
                swaram: row.swaram.trim(),
                sahityam: row.sahityam.trim()
            }))
        }));
        onSave(newComposition, avPerRow);
        onClose();
    };

    // Theme tokens
    const bg = isDark ? '#0a0a0f' : '#ffffff';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const textPrimary = isDark ? '#f0f0fa' : '#0f172a';
    const textMuted = isDark ? 'rgba(240,240,250,0.4)' : 'rgba(15,23,42,0.5)';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/85 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[900px] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border"
                style={{ height: '85vh', background: bg, borderColor }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-5 flex items-center justify-between border-b" style={{ borderColor }}>
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Music className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>Lyrics Editor</h2>
                            <p className="text-[10px] opacity-40 mt-1 uppercase tracking-widest font-bold">
                                Free-form text entry
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Avartana per row toggle */}
                        <div className="flex items-center rounded-2xl border overflow-hidden" style={{ borderColor }}>
                            {[1, 2].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setAvPerRow(n)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        avPerRow === n
                                            ? 'bg-blue-500 text-white'
                                            : `hover:bg-white/5`
                                    }`}
                                    style={avPerRow !== n ? { color: textMuted } : {}}
                                >
                                    {n} Av/Row
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-white/5 transition-all"
                            style={{ color: textPrimary }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12 custom-scrollbar">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-5">
                            {/* Section Header */}
                            <div className="flex flex-col items-center gap-3 group/header">
                                <div className="flex items-center gap-4 w-full justify-center">
                                    <div className="relative flex items-center justify-center max-w-[80%]">
                                        <span className="invisible whitespace-pre px-10 py-3.5 text-xs font-black uppercase tracking-[0.4em]">
                                            {section.name || 'SECTION NAME'}
                                        </span>
                                        <input
                                            value={section.name}
                                            onChange={e => renameSection(sIdx, e.target.value)}
                                            spellCheck={false}
                                            className="absolute inset-0 w-full text-xs font-black uppercase tracking-[0.4em] text-amber-500 bg-amber-500/10 px-8 py-3.5 rounded-2xl border border-amber-500/20 outline-none hover:bg-amber-500/15 focus:border-amber-500/40 focus:bg-amber-500/20 transition-all text-center"
                                            placeholder="SECTION NAME"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeSection(sIdx)}
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-0 group-hover/header:opacity-60 hover:!opacity-100 transition-all hover:bg-red-500/15 text-red-500 border border-transparent hover:border-red-500/30"
                                        title="Delete Section"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="space-y-3">
                                {section.rows.map((row, rowIdx) => (
                                        <div
                                            key={rowIdx}
                                            className={`group flex items-start -ml-8 transition-all ${dragged?.sIdx === sIdx && dragged?.rowIdx === rowIdx ? 'opacity-20' : ''}`}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={() => {
                                                if (!dragged) return;
                                                moveRow(dragged.sIdx, dragged.rowIdx, sIdx, rowIdx);
                                                setDragged(null);
                                            }}
                                        >
                                            {/* Drag Handle */}
                                            <div
                                                draggable
                                                onDragStart={() => setDragged({ sIdx, rowIdx })}
                                                onDragEnd={() => setDragged(null)}
                                                className="w-8 mt-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-[var(--text-muted)] opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 flex flex-col min-w-0">
                                                {/* Text box card */}
                                                <div
                                                    className="rounded-2xl border overflow-hidden transition-all hover:border-blue-500/20"
                                                    style={{ borderColor }}
                                                >
                                                    {/* Swaram text area */}
                                                    <div className="px-4 py-3 border-b" style={{ borderColor }}>
                                                        <div className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-blue-400/60">Swaram</div>
                                                        <textarea
                                                            value={row.swaram}
                                                            onChange={e => updateRow(sIdx, rowIdx, 'swaram', e.target.value)}
                                                            spellCheck={false}
                                                            rows={Math.max(2, Math.ceil(row.swaram.length / 70))}
                                                            className="w-full bg-transparent outline-none font-mono text-sm font-bold tracking-wide resize-y leading-relaxed text-blue-400"
                                                            placeholder="Swaram"
                                                        />
                                                    </div>

                                                    {/* Sahityam text area */}
                                                    <div className="px-4 py-3">
                                                        <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: textMuted }}>Sahityam</div>
                                                        <textarea
                                                            value={row.sahityam}
                                                            onChange={e => updateRow(sIdx, rowIdx, 'sahityam', e.target.value)}
                                                            spellCheck={false}
                                                            rows={Math.max(2, Math.ceil(row.sahityam.length / 70))}
                                                            className="w-full bg-transparent outline-none text-sm font-semibold tracking-wide resize-y leading-relaxed"
                                                            style={{ color: isDark ? 'rgba(240,240,250,0.7)' : 'rgba(15,23,42,0.7)' }}
                                                            placeholder="Sahityam"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Row Hover Toolbar */}
                                                <div className="flex items-center gap-4 mt-1.5 px-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => duplicateRow(sIdx, rowIdx)} className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-400/60 hover:text-blue-400">
                                                        <Copy className="w-3 h-3" /> Duplicate
                                                    </button>
                                                    <button onClick={() => removeRow(sIdx, rowIdx)} className="flex items-center gap-1 text-[8px] font-black uppercase text-red-500/40 hover:text-red-500">
                                                        <Trash2 className="w-3 h-3" /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => addRow(sIdx)}
                                        className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-white/5 border-white/10 text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:bg-white/10 hover:border-white/20 transition-all"
                                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Row</span>
                                    </button>
                                    <button
                                        onClick={() => addSection(sIdx)}
                                        className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-blue-500/10 border-blue-500/20 text-blue-400 opacity-60 hover:opacity-100 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
                                    >
                                        <Section className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New Section</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sections.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-6">
                            <Section className="w-16 h-16" />
                            <p className="text-sm font-black uppercase tracking-widest">No sections yet</p>
                            <button onClick={addSection} className="px-10 py-4 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-[0.2em]">
                                Create First Section
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t flex items-center justify-between" style={{ borderColor }}>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-30">
                        <Music className="w-4 h-4" />
                        <span>Each row = {avPerRow} Avartana{avPerRow > 1 ? 's' : ''} for scroll speed</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 text-sm font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all"
                            style={{ color: textPrimary }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-3 px-10 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Check className="w-5 h-5" />
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {pendingDeleteIdx !== null && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]"
                    onClick={() => setPendingDeleteIdx(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
                        style={{ background: bg, borderColor }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight mb-2" style={{ color: textPrimary }}>Delete Section?</h3>
                        <p className="text-sm opacity-60 mb-8 px-4" style={{ color: textPrimary }}>
                            This will remove the entire section and all its contents. This action cannot be undone.
                        </p>

                        <label className="flex items-center gap-3 mb-8 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-5 h-5 rounded-md border transition-all group-hover:border-blue-500/50"
                                style={{ borderColor: skipDeleteConfirm ? '#3b82f6' : borderColor, background: skipDeleteConfirm ? '#3b82f6' : 'transparent' }}>
                                <input
                                    type="checkbox"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    checked={skipDeleteConfirm}
                                    onChange={e => setSkipDeleteConfirm(e.target.checked)}
                                />
                                {skipDeleteConfirm && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                                Do not ask again
                            </span>
                        </label>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setPendingDeleteIdx(null)}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-white/5 transition-all text-center"
                                style={{ color: textPrimary }}
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmRemoveSection}
                                className="flex-2 px-8 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Delete Section
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
