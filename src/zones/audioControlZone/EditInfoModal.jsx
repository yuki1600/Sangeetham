import React from 'react';
import { X, Check, Plus } from 'lucide-react';
import { getRagaScale } from '../../utils/ragaScales';

/**
 * Audio Control Zone → Edit Info Modal
 *
 * Modal opened from Song Info → "Edit Info" button. Lets the user edit the
 * song's metadata (raga, tala, composer, composition type, arohana,
 * avarohana). On Save, the parent's `onSave` handler PATCHes the server.
 *
 * Pure view over props. The parent owns all state — this component just
 * forwards changes via setters and calls `onSave` / `onClose`.
 */
export default function EditInfoModal({
    // form state (held in parent so it persists across modal opens)
    editInfoRaga,
    setEditInfoRaga,
    editInfoTala,
    setEditInfoTala,
    editInfoComposer,
    setEditInfoComposer,
    editInfoType,
    setEditInfoType,
    editInfoArohana,
    setEditInfoArohana,
    editInfoAvarohana,
    setEditInfoAvarohana,
    editInfoSaving,
    // dropdowns / type list
    allRagas,
    allTalas,
    allComposers,
    compositionTypes,
    // actions
    onSave,
    onClose,
    // theme
    isDark,
    borderColor,
}) {
    const scaleBoxRow = (label, items, setItems, resetScale) => (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</label>
                {resetScale && (
                    <button
                        onClick={() => setItems([...resetScale])}
                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md transition-all hover:bg-purple-500/20"
                        style={{ color: '#a855f7' }}
                    >
                        Reset from Raga
                    </button>
                )}
            </div>
            <div className="flex items-center gap-0 pt-2">
                <div className="flex rounded-2xl border" style={{ borderColor }}>
                    {items.map((swara, i) => (
                        <div key={i} className="relative group/box flex flex-col"
                            style={{ borderRight: i < items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                            <input
                                type="text"
                                value={swara}
                                onChange={e => {
                                    const next = [...items];
                                    next[i] = e.target.value;
                                    setItems(next);
                                }}
                                className="w-14 text-center py-2.5 text-sm font-bold bg-transparent focus:outline-none"
                                style={{ color: '#a855f7' }}
                            />
                            {items.length > 1 && (
                                <button
                                    onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/box:opacity-100 transition-opacity z-10 shadow-sm"
                                    style={{ background: '#ef4444', color: '#fff' }}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => setItems(prev => [...prev, ''])}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-dashed ml-2 transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
                    style={{ borderColor, color: 'var(--text-muted)' }}
                    title="Add swara"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
    const scale = getRagaScale(editInfoRaga);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-2xl rounded-3xl p-6 border overflow-y-auto"
                style={{ background: isDark ? '#141420' : '#fff', borderColor, maxHeight: '85vh' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Edit Info</h2>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-5 mb-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Ragam *</label>
                            <input
                                type="text"
                                value={editInfoRaga}
                                onChange={e => {
                                    setEditInfoRaga(e.target.value);
                                    const s = getRagaScale(e.target.value);
                                    if (s && editInfoArohana.length === 0) setEditInfoArohana([...s.arohana]);
                                    if (s && editInfoAvarohana.length === 0) setEditInfoAvarohana([...s.avarohana]);
                                }}
                                list="edit-info-ragas"
                                placeholder="Select ragam..."
                                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                            />
                            <datalist id="edit-info-ragas">
                                {allRagas.map(r => <option key={r} value={r} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Talam *</label>
                            <input
                                type="text"
                                value={editInfoTala}
                                onChange={e => setEditInfoTala(e.target.value)}
                                list="edit-info-talas"
                                placeholder="Select talam..."
                                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                            />
                            <datalist id="edit-info-talas">
                                {allTalas.map(t => <option key={t} value={t} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Composer</label>
                            <input
                                type="text"
                                value={editInfoComposer}
                                onChange={e => setEditInfoComposer(e.target.value)}
                                list="edit-info-composers"
                                placeholder="Composer..."
                                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                            />
                            <datalist id="edit-info-composers">
                                {allComposers.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Type of Song</label>
                            <select
                                value={editInfoType}
                                onChange={e => setEditInfoType(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                            >
                                <option value="">— Select type —</option>
                                {compositionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {scaleBoxRow('Arohana', editInfoArohana, setEditInfoArohana, scale?.arohana)}
                    {scaleBoxRow('Avarohana', editInfoAvarohana, setEditInfoAvarohana, scale?.avarohana)}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border font-bold text-sm transition-all"
                        style={{ borderColor, color: 'var(--text-muted)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={editInfoSaving || !editInfoRaga.trim() || !editInfoTala.trim()}
                        className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                    >
                        {editInfoSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <><Check className="w-4 h-4" /> Save</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
