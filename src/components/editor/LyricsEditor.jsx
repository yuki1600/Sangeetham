import React, { useState } from 'react';
import { X, Check, Music, Plus, Trash2, GripVertical, Section, Copy, LayoutGrid, AlignLeft } from 'lucide-react';
import { TALA_TEMPLATES } from '../../utils/talaTemplates';

// ---------------------------------------------------------------------------
// Tala helpers (for Grid view)
// ---------------------------------------------------------------------------
function buildTalaMap() {
    const map = {};
    for (const [name, template] of Object.entries(TALA_TEMPLATES)) {
        let beatCount = 0;
        const angas = [];
        for (const tok of template.split(/\s+/)) {
            if (tok === '_') beatCount++;
            else if (tok === '|') angas.push(beatCount);
        }
        const key = name.toLowerCase().replace(/[\s-]/g, '');
        map[key] = { name, beats: beatCount, angas };
    }
    return map;
}
const TALAS = buildTalaMap();

// Detect template-generated placeholder strings (only _ | || and whitespace)
const isTemplatePlaceholder = (str) => /^[\s_|]*$/.test(str);

// True when an entire content entry contains nothing meaningful — i.e. both
// swara and sahitya are empty or template placeholders. The lyrics editor
// drops these so calibration-padding rows don't pollute the editing surface.
const isEmptyEntry = (entry) =>
    isTemplatePlaceholder(entry.swara || '') && isTemplatePlaceholder(entry.sahitya || '');

// ---------------------------------------------------------------------------
// Parse composition → text rows (for Text view)
// ---------------------------------------------------------------------------
function parseToTextSections(composition) {
    if (!Array.isArray(composition)) return [];
    return composition.filter(s => s.section !== 'Aro/Avaro').map(s => ({
        name: s.section,
        rows: (s.content || [])
            .filter(entry => !isEmptyEntry(entry))
            .map(entry => ({
                swara: isTemplatePlaceholder(entry.swara || '') ? '' : (entry.swara || ''),
                sahitya: isTemplatePlaceholder(entry.sahitya || '') ? '' : (entry.sahitya || '')
            }))
    }));
}

// ---------------------------------------------------------------------------
// Parse composition → beat-grid (for Grid view)
// ---------------------------------------------------------------------------
function parseToGridSections(composition, tala) {
    if (!Array.isArray(composition)) return [];
    return composition.filter(s => s.section !== 'Aro/Avaro').map(s => {
        const rows = (s.content || [])
            .filter(entry => !isEmptyEntry(entry))
            .map(entry => {
                const swaraAvs = (entry.swara || '').split('||').map(v => v.trim()).filter(Boolean);
                const sahityaAvs = (entry.sahitya || '').split('||').map(v => v.trim()).filter(Boolean);
                const count = Math.max(swaraAvs.length, sahityaAvs.length, 1);
                const aavartanas = [];
                for (let i = 0; i < count; i++) {
                    const sStr = swaraAvs[i] || '';
                    const lStr = sahityaAvs[i] || '';
                    const sTokens = sStr.replace(/\|+/g, ' ').split(/\s+/).filter(Boolean);
                    const lTokens = lStr.replace(/\|+/g, ' ').split(/\s+/).filter(Boolean);
                    const beats = Array.from({ length: tala.beats }, (_, j) => ({
                        swara: sTokens[j] || '',
                        sahitya: lTokens[j] || ''
                    }));
                    aavartanas.push(beats);
                }
                return aavartanas;
            }).flat();
        return {
            name: s.section,
            aavartanas: rows.length > 0 ? rows : [Array.from({ length: tala.beats }, () => ({ swara: '', sahitya: '' }))]
        };
    });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
/**
 * LyricsEditor
 *
 * Combines two editing modes in a single modal with a header toggle:
 *   • Grid  — beat-cell grid aligned by Tala angas (from main branch)
 *   • Text  — free-form textarea per aavartana row (from lyrics branch)
 *
 * Props:
 *   composition     – the song composition array
 *   initialTalam    – tala name string, used by Grid view
 *   initialAvPerRow – 1 or 2, used by Text view for scroll-speed hint
 *   onSave(newComp, avPerRow) – called on Apply; avPerRow may be undefined in Grid mode
 *   onClose         – called to dismiss the modal
 *   theme           – 'light' | 'dark'
 */
export default function LyricsEditor({
    composition,
    initialTalam = 'adi',
    initialAvPerRow = 1,
    onSave,
    onClose,
    theme
}) {
    const isDark = theme !== 'light';

    // View toggle: 'text' | 'grid'
    const [viewMode, setViewMode] = useState('text');

    // Theme tokens
    const bg          = isDark ? '#0a0a0f' : '#ffffff';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const textPrimary = isDark ? '#f0f0fa' : '#0f172a';
    const textMuted   = isDark ? 'rgba(240,240,250,0.4)' : 'rgba(15,23,42,0.5)';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/85 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className={`flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border ${
                    viewMode === 'grid'
                        ? 'w-fit max-w-[95vw] min-w-[600px]'
                        : 'w-full max-w-[900px]'
                }`}
                style={{ height: '85vh', background: bg, borderColor }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="px-8 py-5 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor }}>
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Music className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>Lyrics Editor</h2>
                            <p className="text-[10px] opacity-40 mt-1 uppercase tracking-widest font-bold">
                                {viewMode === 'grid' ? `${(TALAS[initialTalam.toLowerCase().replace(/[\s-]/g,'')] || TALAS.adi).name} Tala — Beat Grid` : 'Free-form text entry'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center rounded-2xl border overflow-hidden" style={{ borderColor }}>
                            <button
                                onClick={() => setViewMode('text')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    viewMode === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-white/5'
                                }`}
                                style={viewMode !== 'text' ? { color: textMuted } : {}}
                                title="Free-form text editor"
                            >
                                <AlignLeft className="w-3.5 h-3.5" />
                                Text
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    viewMode === 'grid' ? 'bg-violet-500 text-white' : 'hover:bg-white/5'
                                }`}
                                style={viewMode !== 'grid' ? { color: textMuted } : {}}
                                title="Tala-aware beat grid"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Grid
                            </button>
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

                {/* ── View Body ──────────────────────────────────────── */}
                {viewMode === 'text' ? (
                    <TextEditor
                        composition={composition}
                        initialAvPerRow={initialAvPerRow}
                        onSave={onSave}
                        onClose={onClose}
                        isDark={isDark}
                        bg={bg}
                        borderColor={borderColor}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                    />
                ) : (
                    <GridEditor
                        composition={composition}
                        initialTalam={initialTalam}
                        onSave={onSave}
                        onClose={onClose}
                        isDark={isDark}
                        bg={bg}
                        borderColor={borderColor}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                    />
                )}
            </div>
        </div>
    );
}

// ===========================================================================
// TEXT EDITOR (lyrics-branch style: free-form textareas)
// ===========================================================================
function TextEditor({ composition, initialAvPerRow, onSave, onClose, isDark, bg, borderColor, textPrimary, textMuted }) {
    const [avPerRow, setAvPerRow] = useState(initialAvPerRow);
    const [sections, setSections] = useState(() => parseToTextSections(composition));
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
            idx === secIdx ? { ...s, rows: [...s.rows, { swara: '', sahitya: '' }] } : s
        ));
    };

    const addSection = (afterIdx) => {
        setSections(prev => {
            const next = [...prev];
            const newSection = { name: '', rows: [{ swara: '', sahitya: '' }] };
            if (typeof afterIdx === 'number') next.splice(afterIdx + 1, 0, newSection);
            else next.push(newSection);
            return next;
        });
    };

    const removeSection = (secIdx) => {
        if (skipDeleteConfirm) { setSections(prev => prev.filter((_, i) => i !== secIdx)); return; }
        setPendingDeleteIdx(secIdx);
    };

    const confirmRemoveSection = () => {
        if (pendingDeleteIdx !== null) {
            setSections(prev => prev.filter((_, i) => i !== pendingDeleteIdx));
            setPendingDeleteIdx(null);
        }
    };

    const renameSection = (secIdx, newName) =>
        setSections(prev => prev.map((s, idx) => idx === secIdx ? { ...s, name: newName } : s));

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
            newRows.splice(rowIdx + 1, 0, JSON.parse(JSON.stringify(newRows[rowIdx])));
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

    const handleSave = () => {
        const newComposition = sections.map(s => ({
            section: s.name,
            content: s.rows.map(row => ({ swara: row.swara.trim(), sahitya: row.sahitya.trim() }))
        }));
        onSave(newComposition, avPerRow);
        onClose();
    };

    return (
        <>
            {/* Av/Row toggle — inside header area but part of this view's sub-header */}
            <div className="px-8 py-2.5 flex items-center gap-3 border-b flex-shrink-0" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: textPrimary }}>Āvartanas / row</span>
                <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor }}>
                    {[1, 2].map(n => (
                        <button
                            key={n}
                            onClick={() => setAvPerRow(n)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                                avPerRow === n ? 'bg-blue-500 text-white' : 'hover:bg-white/5'
                            }`}
                            style={avPerRow !== n ? { color: textMuted } : {}}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12 custom-scrollbar">
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-5">
                        <SectionHeader
                            name={section.name}
                            onRename={v => renameSection(sIdx, v)}
                            onDelete={() => removeSection(sIdx)}
                        />
                        <div className="space-y-3">
                            {section.rows.map((row, rowIdx) => (
                                <div
                                    key={rowIdx}
                                    className={`group flex items-start -ml-8 transition-all ${dragged?.sIdx === sIdx && dragged?.rowIdx === rowIdx ? 'opacity-20' : ''}`}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => { if (!dragged) return; moveRow(dragged.sIdx, dragged.rowIdx, sIdx, rowIdx); setDragged(null); }}
                                >
                                    <div
                                        draggable
                                        onDragStart={() => setDragged({ sIdx, rowIdx })}
                                        onDragEnd={() => setDragged(null)}
                                        className="w-8 mt-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all"
                                        style={{ color: textMuted }}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="rounded-2xl border overflow-hidden transition-all hover:border-blue-500/20" style={{ borderColor }}>
                                            <div className="px-4 py-3 border-b" style={{ borderColor }}>
                                                <div className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-blue-400/60">Swara</div>
                                                <textarea
                                                    value={row.swara}
                                                    onChange={e => updateRow(sIdx, rowIdx, 'swara', e.target.value)}
                                                    spellCheck={false}
                                                    rows={Math.max(2, Math.ceil(row.swara.length / 70))}
                                                    className="w-full bg-transparent outline-none font-mono text-sm font-bold tracking-wide resize-y leading-relaxed text-blue-400"
                                                    placeholder="Swara"
                                                />
                                            </div>
                                            <div className="px-4 py-3">
                                                <div className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: textMuted }}>Sahitya</div>
                                                <textarea
                                                    value={row.sahitya}
                                                    onChange={e => updateRow(sIdx, rowIdx, 'sahitya', e.target.value)}
                                                    spellCheck={false}
                                                    rows={Math.max(2, Math.ceil(row.sahitya.length / 70))}
                                                    className="w-full bg-transparent outline-none text-sm font-semibold tracking-wide resize-y leading-relaxed"
                                                    style={{ color: isDark ? 'rgba(240,240,250,0.7)' : 'rgba(15,23,42,0.7)' }}
                                                    placeholder="Sahitya"
                                                />
                                            </div>
                                        </div>
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
                                    className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-white/5 opacity-50 hover:opacity-100 hover:bg-white/10 transition-all"
                                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                                >
                                    <Plus className="w-4 h-4" style={{ color: textPrimary }} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: textPrimary }}>Add Row</span>
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
                        <Section className="w-16 h-16" style={{ color: textPrimary }} />
                        <p className="text-sm font-black uppercase tracking-widest" style={{ color: textPrimary }}>No sections yet</p>
                        <button onClick={addSection} className="px-10 py-4 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-[0.2em]">
                            Create First Section
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor }}>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-30" style={{ color: textPrimary }}>
                    <Music className="w-4 h-4" />
                    <span>Each row = {avPerRow} Avartana{avPerRow > 1 ? 's' : ''} for scroll speed</span>
                </div>
                <SaveCancelButtons onClose={onClose} onSave={handleSave} textPrimary={textPrimary} />
            </div>

            <DeleteConfirmModal
                open={pendingDeleteIdx !== null}
                onCancel={() => setPendingDeleteIdx(null)}
                onConfirm={confirmRemoveSection}
                skipDeleteConfirm={skipDeleteConfirm}
                setSkipDeleteConfirm={setSkipDeleteConfirm}
                bg={bg}
                borderColor={borderColor}
                textPrimary={textPrimary}
            />
        </>
    );
}

// ===========================================================================
// GRID EDITOR (main-branch style: tala-aware beat cells)
// ===========================================================================
function GridEditor({ composition, initialTalam, onSave, onClose, isDark, bg, borderColor, textPrimary, textMuted }) {
    const normalizedTalam = initialTalam.toLowerCase().replace(/[\s-]/g, '');
    const tala = TALAS[normalizedTalam] || TALAS.adi;

    const [sections, setSections] = useState(() => parseToGridSections(composition, tala));
    const [dragged, setDragged] = useState(null);
    const [pendingDeleteIdx, setPendingDeleteIdx] = useState(null);
    const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

    // Detect whether the SOURCE composition uses bar markers at all. If the
    // user's JSON had zero `|` characters across every entry we must NOT
    // synthesize them on save — earlier versions of the editor injected bars
    // at every anga boundary even for unbarred compositions, mutating data
    // the user never touched.
    const sourceHasBars = React.useMemo(() => {
        if (!Array.isArray(composition)) return false;
        return composition.some(s =>
            (s.content || []).some(e =>
                (typeof e.swara === 'string' && e.swara.includes('|')) ||
                (typeof e.sahitya === 'string' && e.sahitya.includes('|'))
            )
        );
    }, [composition]);

    const handleBeatChange = (secIdx, avIdx, beatIdx, field, value) => {
        setSections(prev => {
            const next = [...prev];
            const newAvs = [...next[secIdx].aavartanas];
            const newBeats = [...newAvs[avIdx]];
            newBeats[beatIdx] = { ...newBeats[beatIdx], [field]: value };
            newAvs[avIdx] = newBeats;
            next[secIdx] = { ...next[secIdx], aavartanas: newAvs };
            return next;
        });
    };

    const addAavartana = (secIdx) => {
        setSections(prev => prev.map((s, idx) =>
            idx === secIdx
                ? { ...s, aavartanas: [...s.aavartanas, Array.from({ length: tala.beats }, () => ({ swara: '', sahitya: '' }))] }
                : s
        ));
    };

    const addSection = (afterIdx) => {
        setSections(prev => {
            const next = [...prev];
            const newSection = {
                name: '',
                aavartanas: [Array.from({ length: tala.beats }, () => ({ swara: '', sahitya: '' }))]
            };
            if (typeof afterIdx === 'number') next.splice(afterIdx + 1, 0, newSection);
            else next.push(newSection);
            return next;
        });
    };

    const removeSection = (secIdx) => {
        if (skipDeleteConfirm) { setSections(prev => prev.filter((_, i) => i !== secIdx)); return; }
        setPendingDeleteIdx(secIdx);
    };

    const confirmRemoveSection = () => {
        if (pendingDeleteIdx !== null) {
            setSections(prev => prev.filter((_, i) => i !== pendingDeleteIdx));
            setPendingDeleteIdx(null);
        }
    };

    const renameSection = (secIdx, newName) =>
        setSections(prev => prev.map((s, idx) => idx === secIdx ? { ...s, name: newName } : s));

    const moveAv = (fromSec, fromAvIdx, toSec, toAvIdx) => {
        setSections(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const item = next[fromSec].aavartanas.splice(fromAvIdx, 1)[0];
            next[toSec].aavartanas.splice(toAvIdx, 0, item);
            return next;
        });
    };

    const duplicateAv = (secIdx, avIdx) => {
        setSections(prev => prev.map((s, idx) => {
            if (idx !== secIdx) return s;
            const newAvs = [...s.aavartanas];
            newAvs.splice(avIdx + 1, 0, JSON.parse(JSON.stringify(newAvs[avIdx])));
            return { ...s, aavartanas: newAvs };
        }));
    };

    const removeAv = (secIdx, avIdx) => {
        setSections(prev => prev.map((s, idx) => {
            if (idx !== secIdx) return s;
            if (s.aavartanas.length <= 1) return s;
            return { ...s, aavartanas: s.aavartanas.filter((_, i) => i !== avIdx) };
        }));
    };

    const handleKeyDown = (e, field) => {
        if (e.key === 'Tab') {
            const inputs = Array.from(document.querySelectorAll(`input[data-nav-field="${field}"]`));
            const currIdx = inputs.indexOf(e.target);
            if (currIdx === -1) return;
            const nextIdx = e.shiftKey ? currIdx - 1 : currIdx + 1;
            if (nextIdx >= 0 && nextIdx < inputs.length) {
                e.preventDefault();
                inputs[nextIdx].focus();
                setTimeout(() => inputs[nextIdx].select(), 0);
            }
        }
    };

    const handleSave = () => {
        const newComposition = sections.map(s => {
            const content = s.aavartanas.map(av => {
                if (!sourceHasBars) {
                    // Source had no bars — preserve that. Just space-separate
                    // the beats with no `|` or `||` markers at all. Empty
                    // beats become "-" so positional alignment still survives.
                    const sParts = av.map(beat => beat.swara || '-');
                    const lParts = av.map(beat => beat.sahitya || '-');
                    return { swara: sParts.join(' '), sahitya: lParts.join(' ') };
                }
                // Source had bars — re-emit them at anga boundaries and
                // close each aavartana with `||`.
                let sParts = [], lParts = [];
                av.forEach((beat, idx) => {
                    const beatNum = idx + 1;
                    sParts.push(beat.swara || '-');
                    lParts.push(beat.sahitya || '-');
                    if (tala.angas.includes(beatNum)) { sParts.push('|'); lParts.push('|'); }
                });
                return { swara: sParts.join(' ') + ' ||', sahitya: lParts.join(' ') + ' ||' };
            });
            return { section: s.name, content };
        });
        onSave(newComposition);
        onClose();
    };

    return (
        <>
            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12 custom-scrollbar">
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-6">
                        <SectionHeader
                            name={section.name}
                            onRename={v => renameSection(sIdx, v)}
                            onDelete={() => removeSection(sIdx)}
                        />
                        <div className="space-y-4">
                            {section.aavartanas.map((av, avIdx) => (
                                <div
                                    key={avIdx}
                                    className={`group flex items-start -ml-8 transition-all ${dragged?.sIdx === sIdx && dragged?.avIdx === avIdx ? 'opacity-20' : ''}`}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => { if (!dragged) return; moveAv(dragged.sIdx, dragged.avIdx, sIdx, avIdx); setDragged(null); }}
                                >
                                    {/* Drag Handle */}
                                    <div
                                        draggable
                                        onDragStart={() => setDragged({ sIdx, avIdx })}
                                        onDragEnd={() => setDragged(null)}
                                        className="w-8 h-24 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all"
                                        style={{ color: textMuted }}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="overflow-x-auto overflow-y-hidden pb-2 -mb-2 scrollbar-none">
                                            <div className="flex items-start gap-5 w-fit pr-10">
                                                {(() => {
                                                    const groups = [];
                                                    let currentGroup = [];
                                                    av.forEach((beat, bIdx) => {
                                                        const beatNum = bIdx + 1;
                                                        currentGroup.push({ beat, actualIdx: bIdx });
                                                        if (tala.angas.includes(beatNum) || beatNum === tala.beats) {
                                                            groups.push(currentGroup);
                                                            currentGroup = [];
                                                        }
                                                    });
                                                    return groups.map((group, gIdx) => (
                                                        <div key={gIdx} className="flex rounded-xl border bg-white/5 overflow-hidden shadow-sm" style={{ borderColor }}>
                                                            {group.map(({ beat, actualIdx }, bIdx) => (
                                                                <div key={bIdx} className="w-22 sm:w-26 flex flex-col border-r last:border-r-0" style={{ borderColor }}>
                                                                    {/* Swara cell */}
                                                                    <div className="h-12 border-b flex items-center px-1" style={{ borderColor }}>
                                                                        <input
                                                                            value={beat.swara}
                                                                            onChange={e => handleBeatChange(sIdx, avIdx, actualIdx, 'swara', e.target.value)}
                                                                            onKeyDown={e => handleKeyDown(e, 'swara')}
                                                                            data-nav-field="swara"
                                                                            spellCheck={false}
                                                                            className="w-full bg-transparent outline-none text-center font-mono text-base font-black tracking-widest text-violet-400"
                                                                            placeholder="-"
                                                                        />
                                                                    </div>
                                                                    {/* Sahitya cell */}
                                                                    <div className="h-11 flex items-center px-1">
                                                                        <input
                                                                            value={beat.sahitya}
                                                                            onChange={e => handleBeatChange(sIdx, avIdx, actualIdx, 'sahitya', e.target.value)}
                                                                            onKeyDown={e => handleKeyDown(e, 'sahitya')}
                                                                            data-nav-field="sahitya"
                                                                            className="w-full bg-transparent outline-none text-center text-base font-bold"
                                                                            style={{ color: textMuted }}
                                                                            placeholder="…"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => duplicateAv(sIdx, avIdx)} className="flex items-center gap-1 text-[8px] font-black uppercase text-violet-400/60 hover:text-violet-400">
                                                <Copy className="w-3 h-3" /> Duplicate
                                            </button>
                                            <button onClick={() => removeAv(sIdx, avIdx)} className="flex items-center gap-1 text-[8px] font-black uppercase text-red-500/40 hover:text-red-500">
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => addAavartana(sIdx)}
                                    className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-white/5 opacity-50 hover:opacity-100 hover:bg-white/10 transition-all"
                                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                                >
                                    <Plus className="w-4 h-4" style={{ color: textPrimary }} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: textPrimary }}>Add Āvartana</span>
                                </button>
                                <button
                                    onClick={() => addSection(sIdx)}
                                    className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-violet-500/10 border-violet-500/20 text-violet-400 opacity-60 hover:opacity-100 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all"
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
                        <Section className="w-16 h-16" style={{ color: textPrimary }} />
                        <p className="text-sm font-black uppercase tracking-widest" style={{ color: textPrimary }}>No sections yet</p>
                        <button onClick={addSection} className="px-10 py-4 rounded-2xl bg-violet-500 text-white font-black uppercase tracking-[0.2em]">
                            Create First Section
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor }}>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-30" style={{ color: textPrimary }}>
                    <Music className="w-4 h-4" />
                    <span>Each box = One Beat · Tab to navigate</span>
                </div>
                <SaveCancelButtons onClose={onClose} onSave={handleSave} textPrimary={textPrimary} />
            </div>

            <DeleteConfirmModal
                open={pendingDeleteIdx !== null}
                onCancel={() => setPendingDeleteIdx(null)}
                onConfirm={confirmRemoveSection}
                skipDeleteConfirm={skipDeleteConfirm}
                setSkipDeleteConfirm={setSkipDeleteConfirm}
                bg={bg}
                borderColor={borderColor}
                textPrimary={textPrimary}
            />
        </>
    );
}

// ===========================================================================
// Shared sub-components
// ===========================================================================
function SectionHeader({ name, onRename, onDelete }) {
    return (
        <div className="flex flex-col items-center gap-3 group/header">
            <div className="flex items-center gap-4 w-full justify-center">
                <div className="relative flex items-center justify-center max-w-[80%]">
                    <span className="invisible whitespace-pre px-10 py-3.5 text-xs font-black uppercase tracking-[0.4em]">
                        {name || 'SECTION NAME'}
                    </span>
                    <input
                        value={name}
                        onChange={e => onRename(e.target.value)}
                        spellCheck={false}
                        className="absolute inset-0 w-full text-xs font-black uppercase tracking-[0.4em] text-amber-500 bg-amber-500/10 px-8 py-3.5 rounded-2xl border border-amber-500/20 outline-none hover:bg-amber-500/15 focus:border-amber-500/40 focus:bg-amber-500/20 transition-all text-center"
                        placeholder="SECTION NAME"
                    />
                </div>
                <button
                    onClick={onDelete}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-0 group-hover/header:opacity-60 hover:!opacity-100 transition-all hover:bg-red-500/15 text-red-500 border border-transparent hover:border-red-500/30"
                    title="Delete Section"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function SaveCancelButtons({ onClose, onSave, textPrimary }) {
    return (
        <div className="flex items-center gap-4">
            <button
                onClick={onClose}
                className="px-8 py-3 text-sm font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all"
                style={{ color: textPrimary }}
            >
                Cancel
            </button>
            <button
                onClick={onSave}
                className="flex items-center gap-3 px-10 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                <Check className="w-5 h-5" />
                Apply Changes
            </button>
        </div>
    );
}

function DeleteConfirmModal({ open, onCancel, onConfirm, skipDeleteConfirm, setSkipDeleteConfirm, bg, borderColor, textPrimary }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]"
            onClick={onCancel}
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
                    <div
                        className="relative flex items-center justify-center w-5 h-5 rounded-md border transition-all group-hover:border-blue-500/50"
                        style={{ borderColor: skipDeleteConfirm ? '#3b82f6' : borderColor, background: skipDeleteConfirm ? '#3b82f6' : 'transparent' }}
                    >
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
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-white/5 transition-all text-center"
                        style={{ color: textPrimary }}
                    >
                        Back
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-2 px-8 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Delete Section
                    </button>
                </div>
            </div>
        </div>
    );
}
