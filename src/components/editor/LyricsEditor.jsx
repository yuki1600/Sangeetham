import React, { useState } from 'react';
import { X, FileText, Check, Music, Plus, Copy, Trash2, ChevronDown, GripVertical, Section } from 'lucide-react';

/**
 * Common Tala Metadata
 * Defines beat count and anga (section) boundaries for visual dividers.
 */
const TALAS = {
    adi: { name: 'Adi', beats: 8, angas: [4, 6] },
    rupakam: { name: 'Rupakam', beats: 6, angas: [2] },
    rupaka: { name: 'Rupakam', beats: 6, angas: [2] }, // variant name
    triputa: { name: 'Triputa', beats: 7, angas: [3, 5] },
    jhampa: { name: 'Jhampa', beats: 10, angas: [7, 8] },
    matya: { name: 'Matya', beats: 10, angas: [4, 6] },
    dhruva: { name: 'Dhruva', beats: 14, angas: [4, 6, 10] },
    ata: { name: 'Ata', beats: 14, angas: [5, 10, 12] },
    eaka: { name: 'Eaka', beats: 4, angas: [] },
};

/**
 * LyricsEditor
 * A domain-accurate grid system for Carnatic notation.
 * Swara and Sahitya are aligned in "beat cells" across rows.
 */
export default function LyricsEditor({ composition, initialTalam = 'adi', onSave, onClose, theme }) {
    const isDark = theme !== 'light';
    const normalizedTalam = initialTalam.toLowerCase().replace(/[\s-]/g, '');
    const tala = TALAS[normalizedTalam] || TALAS.adi;

    /**
     * Parse the JSON composition into a structured grid.
     * Beats are separated by spaces. Angas by |. Aavartanas by ||.
     */
    const [sections, setSections] = useState(() => {
        if (!Array.isArray(composition)) return [];
        return composition.map(s => {
            const rows = (s.content || []).map(entry => {
                const swaraAvs = (entry.swaram || '').split('||').map(v => v.trim()).filter(Boolean);
                const sahityaAvs = (entry.sahityam || '').split('||').map(v => v.trim()).filter(Boolean);
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
    });

    const [dragged, setDragged] = useState(null); // { sIdx, avIdx }
    const [pendingDeleteIdx, setPendingDeleteIdx] = useState(null);
    const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

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
            const copy = JSON.parse(JSON.stringify(newAvs[avIdx]));
            newAvs.splice(avIdx + 1, 0, copy);
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
            const selector = `input[data-nav-field="${field}"]`;
            const inputs = Array.from(document.querySelectorAll(selector));
            const currIdx = inputs.indexOf(e.target);
            
            if (currIdx === -1) return;
            
            const nextIdx = e.shiftKey ? currIdx - 1 : currIdx + 1;
            
            if (nextIdx >= 0 && nextIdx < inputs.length) {
                e.preventDefault();
                inputs[nextIdx].focus();
                // Select all text to make overwriting easy
                setTimeout(() => inputs[nextIdx].select(), 0);
            }
        }
    };

    /**
     * Serializes the beat grid back into the standard JSON string format.
     * Inserts | and || based on the Tala's structure.
     */
    const handleSave = () => {
        const newComposition = sections.map(s => {
            const content = s.aavartanas.map(av => {
                let sParts = [];
                let lParts = [];
                
                av.forEach((beat, idx) => {
                    const beatNum = idx + 1;
                    sParts.push(beat.swara || '-');
                    lParts.push(beat.sahitya || '-');

                    if (tala.angas.includes(beatNum)) {
                        sParts.push('|');
                        lParts.push('|');
                    }
                });

                return {
                    swaram: sParts.join(' ') + ' ||',
                    sahityam: lParts.join(' ') + ' ||'
                };
            });
            return { section: s.name, content };
        });
        onSave(newComposition);
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
                className="w-fit max-w-[95vw] min-w-[600px] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border"
                style={{ height: '85vh', background: bg, borderColor: borderColor }}
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
                                {tala.name} Tala Mode — Direct Grid Entry
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-white/5 transition-all"
                        style={{ color: textPrimary }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12 custom-scrollbar">
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-6">
                            {/* Section Header - Centered */}
                            <div className="flex flex-col items-center gap-3 group/header">
                                <div className="flex items-center gap-4 w-full justify-center">
                                    <div className="relative flex items-center justify-center max-w-[80%]">
                                        {/* Invisible mirror span to drive width */}
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

                            <div className="space-y-4">
                                {section.aavartanas.map((av, avIdx) => (
                                    <div 
                                        key={avIdx} 
                                        className={`group flex items-start -ml-8 transition-all ${dragged?.sIdx === sIdx && dragged?.avIdx === avIdx ? 'opacity-20' : ''}`}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={() => {
                                            if (!dragged) return;
                                            moveAv(dragged.sIdx, dragged.avIdx, sIdx, avIdx);
                                            setDragged(null);
                                        }}
                                    >
                                        {/* Drag Handle */}
                                        <div 
                                            draggable
                                            onDragStart={() => setDragged({ sIdx, avIdx })}
                                            onDragEnd={() => setDragged(null)}
                                            className="w-8 h-24 flex items-center justify-center cursor-grab active:cursor-grabbing text-[var(--text-muted)] opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all"
                                        >
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        {/* Container for Grid + Toolbar */}
                                        <div className="flex-1 flex flex-col min-w-0">
                                            {/* Scrollable Grid Row Wrapper */}
                                            <div className="overflow-x-auto overflow-y-hidden pb-2 -mb-2 scrollbar-none">
                                                {/* Grid Row - Grouped by Angas */}
                                                <div className="flex items-start gap-5 w-fit pr-10">
                                                    {(() => {
                                                        // Create Groups based on Tala's Angas
                                                        const groups = [];
                                                        let currentGroup = [];
                                                        av.forEach((beat, bIdx) => {
                                                            const beatNum = bIdx + 1;
                                                            currentGroup.push(beat);
                                                            if (tala.angas.includes(beatNum) || beatNum === tala.beats) {
                                                                groups.push(currentGroup);
                                                                currentGroup = [];
                                                            }
                                                        });

                                                        return groups.map((group, gIdx) => (
                                                            <div key={gIdx} className="flex rounded-xl border bg-white/5 overflow-hidden shadow-sm" style={{ borderColor }}>
                                                                {group.map((beat, bIdx) => {
                                                                    const actualIdx = av.indexOf(beat);
                                                                    return (
                                                                        <div 
                                                                            key={bIdx} 
                                                                            className="w-22 sm:w-26 flex flex-col border-r last:border-r-0"
                                                                            style={{ borderColor }}
                                                                        >
                                                                            {/* Swara Cell - Large Mono */}
                                                                            <div className="h-12 border-b flex items-center px-1" style={{ borderColor }}>
                                                                                <input 
                                                                                    value={beat.swara}
                                                                                    onChange={e => handleBeatChange(sIdx, avIdx, actualIdx, 'swara', e.target.value)}
                                                                                    onKeyDown={e => handleKeyDown(e, 'swara')}
                                                                                    data-nav-field="swara"
                                                                                    spellCheck={false}
                                                                                    className="w-full bg-transparent outline-none text-center font-mono text-base font-black tracking-widest text-blue-400"
                                                                                    placeholder="-"
                                                                                />
                                                                            </div>
                                                                            {/* Sahitya Cell - Large Bold */}
                                                                            <div className="h-11 flex items-center px-1">
                                                                                <input 
                                                                                    value={beat.sahitya}
                                                                                    onChange={e => handleBeatChange(sIdx, avIdx, actualIdx, 'sahitya', e.target.value)}
                                                                                    onKeyDown={e => handleKeyDown(e, 'sahitya')}
                                                                                    data-nav-field="sahitya"
                                                                                    className="w-full bg-transparent outline-none text-center text-base font-bold"
                                                                                    style={{ color: textMuted }}
                                                                                    placeholder="..."
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Row Hover Toolbar */}
                                            <div className="flex items-center gap-4 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => duplicateAv(sIdx, avIdx)} className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-400/60 hover:text-blue-400">
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
                                        className="flex-1 py-4 rounded-2xl border border-dashed flex items-center justify-center gap-3 bg-white/5 border-white/10 text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:bg-white/10 hover:border-white/20 transition-all"
                                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Āvartana</span>
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
                        <span>Each box = One Beat (Parsed by Spaces)</span>
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
