import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Music, Pencil, Trash2, Clock, Layers, Upload, X, FileAudio, FileJson, Check, Globe, Layout, Search, ChevronDown, Settings, FileText, Heart, ArrowUpDown, Calendar, Edit3, SortAsc, Download } from 'lucide-react';
import { TALA_TEMPLATES, STANDARD_SECTIONS, generateCompositionTemplate } from '../../utils/talaTemplates';
import { ALL_SONGS } from '../../utils/carnaticData';
import { ALL_SONG_METADATA } from '../../utils/allSongMetadata';
import { useDropdown } from '../../hooks/useDropdown';
import { triggerDownload } from '../../utils/triggerDownload';

function MultiSelectSearchableDropdown({ label, selected, onChange, options, isDark, borderColor, icon: Icon }) {
    const { open, setOpen, ref: wrapperRef } = useDropdown();
    const [query, setQuery] = useState('');

    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
    const toggleOption = (opt) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="relative flex-1 min-w-[140px]" ref={wrapperRef}>
            <div 
                onClick={() => setOpen(!open)}
                className="group flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all cursor-pointer hover:border-emerald-500/50"
                style={{ 
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                    borderColor: open ? 'var(--text-muted)' : borderColor,
                    color: 'var(--text-primary)'
                }}
            >
                {Icon && <Icon className="w-3.5 h-3.5 opacity-40" />}
                <div className="flex-1 truncate">
                    {selected.length === 0 ? (
                        <span className="opacity-40">{label}</span>
                    ) : (
                        <span className="font-bold text-emerald-500">{label} ({selected.length})</span>
                    )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 opacity-40 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <div 
                    className="absolute z-20 w-full mt-1 border rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col"
                    style={{ background: isDark ? '#1a1a24' : '#fff', borderColor }}
                >
                    <div className="p-2 border-b" style={{ borderColor }}>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
                            <input
                                autoFocus
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500/30"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                        {filtered.length > 0 ? filtered.map(opt => (
                            <label
                                key={opt}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-emerald-500/10 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => toggleOption(opt)}
                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                />
                                <span className="truncate">{opt}</span>
                            </label>
                        )) : (
                            <div className="px-3 py-2 text-xs italic opacity-40 text-center">No matches</div>
                        )}
                    </div>
                    {selected.length > 0 && (
                        <div className="p-2 border-t" style={{ borderColor }}>
                            <button 
                                onClick={() => onChange([])}
                                className="w-full py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
                            >
                                Clear Selected
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SearchableSelect({ label, value, onChange, options, isDark, borderColor, formatOption }) {
    const { open, setOpen, ref: wrapperRef } = useDropdown();
    const [query, setQuery] = useState('');

    // If query is exactly the selected value, the user hasn't typed anything new,
    // so don't filter the list at all. Let them see all options.
    const isPristine = (query === value);
    const searchStr = open && !isPristine ? query : '';
    const filtered = options.filter(o => o.toLowerCase().includes(searchStr.toLowerCase()));

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    value={open ? query : value}
                    onChange={e => {
                        setQuery(e.target.value);
                        onChange(e.target.value); 
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => { setOpen(true); setQuery(value); }}
                    placeholder={`Select ${label.replace(/\s*\*\s*$/, '').trim()}`}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border text-sm transition-all focus:outline-none"
                    style={{ 
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
                        borderColor: open ? 'var(--text-muted)' : borderColor,
                        color: 'var(--text-primary)'
                    }}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" />
            </div>
            {open && (
                <div 
                    className="absolute z-10 w-full mt-1 border rounded-xl shadow-2xl max-h-48 overflow-y-auto"
                    style={{ background: isDark ? '#1a1a24' : '#fff', borderColor }}
                >
                    {filtered.length > 0 ? filtered.map(opt => (
                        <button
                            key={opt}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                            onClick={(e) => { e.preventDefault(); onChange(opt); setOpen(false); setQuery(''); }}
                        >
                            {formatOption ? formatOption(opt) : opt}
                        </button>
                    )) : (
                        <div className="px-3 py-2 text-xs italic opacity-50">Press enter or click outside to use custom value</div>
                    )}
                </div>
            )}
        </div>
    );
}

function SortDropdown({ value, onChange, isDark, borderColor }) {
    const { open, setOpen, ref: wrapperRef } = useDropdown();

    const options = [
        { id: 'date-desc', label: 'Newest Added', icon: Calendar },
        { id: 'date-asc', label: 'Oldest Added', icon: Calendar },
        { id: 'title-asc', label: 'Alphabetical (A-Z)', icon: SortAsc },
        { id: 'title-desc', label: 'Alphabetical (Z-A)', icon: SortAsc },
        { id: 'updated-desc', label: 'Last Modified', icon: Edit3 },
    ];

    const selected = options.find(o => o.id === value) || options[0];

    return (
        <div className="relative" ref={wrapperRef}>
            <button 
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all hover:border-emerald-500/50"
                style={{ 
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                    borderColor,
                    color: 'var(--text-primary)'
                }}
            >
                <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                <span className="hidden sm:inline opacity-50">Sort:</span>
                <span className="text-emerald-500">{selected.label}</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div 
                    className="absolute right-0 z-20 mt-1 w-56 border rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{ background: isDark ? '#1a1a24' : '#fff', borderColor }}
                >
                    {options.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => { onChange(opt.id); setOpen(false); }}
                            className={`flex items-center gap-3 w-full px-4 py-2 text-xs font-medium transition-colors hover:bg-emerald-500/10 ${value === opt.id ? 'text-emerald-500 bg-emerald-500/5' : 'text-var(--text-muted)'}`}
                        >
                            <opt.icon className="w-3.5 h-3.5 opacity-40" />
                            {opt.label}
                            {value === opt.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * TypeBanner — small fabric-flag style ribbon hanging from the top edge of
 * each editor card, showing the song's compositionType. Display-only — the
 * type itself is edited via the Settings dropdown on the card.
 *
 * Visually it sticks slightly above the top edge of the card and has a
 * notched (V-cut) bottom so it reads as a hanging fabric banner.
 */
function TypeBanner({ song, color }) {
    if (!song.compositionType) return null;
    return (
        <div className="absolute right-4 -top-3 z-10 pointer-events-none select-none">
            {/* The "rope" — two short threads pinning the banner to the top of the card */}
            <div className="relative h-2.5 flex justify-between px-3">
                <span className="block w-px h-2.5" style={{ background: `${color}aa` }} />
                <span className="block w-px h-2.5" style={{ background: `${color}aa` }} />
            </div>
            {/* The fabric */}
            <div
                className="px-4 pt-1.5 pb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white text-center"
                style={{
                    background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                    minWidth: '88px',
                    clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
                    boxShadow: `0 6px 14px -4px ${color}66, 0 2px 4px rgba(0,0,0,0.18)`,
                    textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                }}
            >
                {song.compositionType}
            </div>
        </div>
    );
}

export default function SongEditor({ theme, onEditSong, onBack }) {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadState, setUploadState] = useState({
        swaraAudio: null,
        sahityaAudio: null,
        jsonFile: null,
        pdfFile: null,
        uploading: false,
        error: null,
    });
    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'manual'
    // When the user picks a PDF without a JSON in Auto Setup, raga/tala
    // are required (server has no other way to derive them).
    const [autoRaga, setAutoRaga] = useState('');
    const [autoTala, setAutoTala] = useState('');
    const [autoComposer, setAutoComposer] = useState('');
    const [uploadTitle, setUploadTitle] = useState('');
    const [manualRaga, setManualRaga] = useState('');
    const [manualTala, setManualTala] = useState('');
    const [manualComposer, setManualComposer] = useState('');
    const [manualSections, setManualSections] = useState(['Pallavi', 'Anupallavi', 'Charanam']);

    const EXPANDED_RAGAM_LIST = ALL_SONG_METADATA.ragas;

    const baseRagas = ALL_SONG_METADATA.ragas;
    const baseTalas = ALL_SONG_METADATA.talas;
    const baseComposers = ALL_SONG_METADATA.composers;

    // Normalize and merge dynamic songs from DB
    const allRagas = [...new Set([...baseRagas, ...songs.map(s => s.raga).filter(Boolean)])].sort();
    const allTalas = [...new Set([...baseTalas, ...songs.map(s => s.tala).filter(Boolean)])].sort();
    const allComposers = [...new Set([...baseComposers, ...songs.map(s => s.composer).filter(Boolean)])].sort();

        
    const [editingMetaId, setEditingMetaId] = useState(null);
    const [editRaga, setEditRaga] = useState('');
    const [editTala, setEditTala] = useState('');
    const [editComposer, setEditComposer] = useState('');
    const [editType, setEditType] = useState('');

    // Canonical list of composition types — used by the Type field inside
    // the Settings (gear) dropdown on each card.
    const COMPOSITION_TYPES = [
        'Geetham', 'Swarajathi', 'Varnam', 'Kriti', 'Tillana', 'Javali',
        'Padam', 'Devaranama', 'Sankeertana', 'Bhajan', 'Slokam', 'Viruttam',
    ];

    // Per-type accent colors so the banner is recognisable at a glance.
    const TYPE_COLORS = {
        Geetham:     '#10b981',
        Swarajathi:  '#06b6d4',
        Varnam:      '#8b5cf6',
        Kriti:       '#f59e0b',
        Tillana:     '#ec4899',
        Javali:      '#f43f5e',
        Padam:       '#a855f7',
        Devaranama:  '#3b82f6',
        Sankeertana: '#14b8a6',
        Bhajan:      '#f97316',
        Slokam:      '#eab308',
        Viruttam:    '#6366f1',
    };
    const typeColor = (t) => TYPE_COLORS[t] || '#64748b';

    // Filter states
    const [filterTitle, setFilterTitle] = useState('');
    const [filterRagas, setFilterRagas] = useState([]);
    const [filterTalas, setFilterTalas] = useState([]);
    const [filterComposers, setFilterComposers] = useState([]);
    const [sortBy, setSortBy] = useState('date-desc');
    const [bulkPublishing, setBulkPublishing] = useState(false);

    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);
    const swaraInputRef = useRef(null);
    const sahityaInputRef = useRef(null);
    const jsonInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    /**
     * Generate a sample composition JSON the user can download, edit, and
     * re-upload via the "JSON file" mode. Uses the same template generator
     * the manual flow uses, so the schema stays in lock-step with the
     * server's expectations.
     */
    /**
     * Pick a PDF, then ask the server to extract metadata from its header
     * (title / raga / tala / composer / arohanam / avarohanam / janya / jati).
     * Anything we get back is poured into the contextual auto-meta fields
     * AND into uploadTitle (if the user hasn't typed one yet) so the user
     * doesn't have to retype data the PDF already exposes.
     */
    const [pdfParsing, setPdfParsing] = useState(false);
    const handlePdfPicked = async (file) => {
        setUploadState(s => ({ ...s, pdfFile: file, error: null }));
        if (!file) return;
        setPdfParsing(true);
        try {
            const fd = new FormData();
            fd.append('pdf', file);
            const res = await fetch('/api/songs/parse-pdf', { method: 'POST', body: fd });
            if (!res.ok) return; // silent — user can still type fields manually
            const meta = await res.json();
            if (meta.name && !uploadTitle.trim()) setUploadTitle(meta.name);
            if (meta.raga) setAutoRaga(meta.raga);
            if (meta.tala) setAutoTala(meta.tala);
            if (meta.composer) setAutoComposer(meta.composer);
        } catch (err) {
            console.warn('PDF parse failed:', err);
        } finally {
            setPdfParsing(false);
        }
    };

    const handleDownloadTemplate = () => {
        const tala = manualTala || 'Adi';
        const sections = manualSections.length ? manualSections : ['Pallavi', 'Anupallavi', 'Charanam'];
        const template = generateCompositionTemplate(
            uploadTitle.trim() || 'Sample Song',
            tala,
            sections,
            manualRaga || 'Sample Raga',
            manualComposer || 'Composer Name',
            0,
        );
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        triggerDownload(blob, 'sangeetham-template.json');
    };

    const isDark = theme !== 'light';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    const fetchSongs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/songs');
            if (!res.ok) throw new Error('Failed to load songs');
            setSongs(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSongs(); }, []);

    const startRename = (song) => {
        setRenamingId(song.id);
        setRenameValue(song.title);
        setTimeout(() => renameInputRef.current?.select(), 50);
    };

    const commitRename = async (id) => {
        const newTitle = renameValue.trim();
        if (!newTitle) { setRenamingId(null); return; }
        try {
            const res = await fetch(`/api/songs/${id}/title`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            });
            if (!res.ok) throw new Error('Rename failed');
            setSongs(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
        } catch (e) {
            alert('Rename failed: ' + e.message);
        } finally {
            setRenamingId(null);
        }
    };

    const startMetaEdit = (song) => {
        setEditingMetaId(song.id);
        setEditRaga(song.raga || '');
        setEditTala(song.tala || '');
        setEditComposer(song.composer || '');
        setEditType(song.compositionType || '');
    };

    const commitMetaEdit = async (id) => {
        if (!editRaga.trim() || !editTala.trim()) return;
        try {
            const res = await fetch(`/api/songs/${id}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raga: editRaga.trim(),
                    tala: editTala.trim(),
                    composer: editComposer.trim(),
                    compositionType: editType.trim(),
                }),
            });
            if (!res.ok) throw new Error('Update failed');
            const data = await res.json();
            setSongs(prev => prev.map(s => s.id === id ? {
                ...s,
                raga: data.raga,
                tala: data.tala,
                composer: data.composer,
                compositionType: data.compositionType,
            } : s));
        } catch (e) {
            alert('Update failed: ' + e.message);
        } finally {
            setEditingMetaId(null);
        }
    };


    const togglePublish = async (id, currentPublished) => {
        try {
            const res = await fetch(`/api/songs/${id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublished: !currentPublished }) 
            });
            if (!res.ok) throw new Error('Toggle publish failed');
            const data = await res.json();
            setSongs(prev => prev.map(s => s.id === id ? { ...s, isPublished: data.isPublished } : s));
        } catch (e) {
            alert('Publish toggle failed: ' + e.message);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setSongs(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            alert('Delete failed: ' + e.message);
        }
    };

    const handleUploadSubmit = async () => {
        const { swaraAudio, sahityaAudio, jsonFile, pdfFile } = uploadState;
        if (!uploadTitle.trim()) {
            setUploadState(s => ({ ...s, error: 'Please enter a song title.' }));
            return;
        }
        if (!swaraAudio && !sahityaAudio) {
            setUploadState(s => ({ ...s, error: 'Please select at least one audio file (Swara or Sahitya).' }));
            return;
        }

        // Auto Setup with PDF-only and Manual Setup both need raga + tala
        // from the form (no JSON for the server to read them out of).
        const needsManualMeta =
            uploadMode === 'manual' ||
            (uploadMode === 'file' && !jsonFile && pdfFile);
        const metaRaga = uploadMode === 'manual' ? manualRaga : autoRaga;
        const metaTala = uploadMode === 'manual' ? manualTala : autoTala;
        const metaComposer = uploadMode === 'manual' ? manualComposer : autoComposer;

        if (needsManualMeta) {
            if (!metaRaga.trim()) {
                setUploadState(s => ({ ...s, error: 'Ragam is required when uploading a PDF without a JSON.' }));
                return;
            }
            if (!metaTala.trim()) {
                setUploadState(s => ({ ...s, error: 'Talam is required when uploading a PDF without a JSON.' }));
                return;
            }
        }

        if (uploadMode === 'file' && !jsonFile && !pdfFile) {
            setUploadState(s => ({ ...s, error: 'Please select a JSON composition or a PDF reference (or both).' }));
            return;
        }

        // Check for duplicate song (same title + raga + tala)
        const trimTitle = uploadTitle.trim().toLowerCase();
        const trimRaga = (needsManualMeta ? metaRaga.trim() : '').toLowerCase();
        const trimTala = (needsManualMeta ? metaTala.trim() : '').toLowerCase();
        const duplicate = songs.find(s => {
            if (s.title?.toLowerCase() !== trimTitle) return false;
            if (!needsManualMeta) return true; // same title is enough when raga/tala come from JSON
            return (s.raga?.toLowerCase() || '') === trimRaga
                && (s.tala?.toLowerCase() || '') === trimTala;
        });
        if (duplicate) {
            setUploadState(s => ({ ...s, error: `A song titled "${duplicate.title}" with the same raga and tala already exists. Please pick a different name.` }));
            return;
        }

        let finalJsonFile = jsonFile;

        if (uploadMode === 'manual') {
            if (manualSections.length === 0) {
                setUploadState(s => ({ ...s, error: 'Please select at least one section.' }));
                return;
            }
            // Decode the audio to get its duration for avartana distribution
            let audioDuration = 0;
            const audioFile = swaraAudio || sahityaAudio;
            if (audioFile) {
                try {
                    const arrayBuf = await audioFile.arrayBuffer();
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
                    audioDuration = decoded.duration;
                    audioCtx.close();
                } catch (e) {
                    console.warn('Could not decode audio for duration:', e);
                }
            }
            const title = uploadTitle.trim();
            const templateObj = generateCompositionTemplate(title, manualTala, manualSections, manualRaga, manualComposer, audioDuration);
            finalJsonFile = new File([JSON.stringify(templateObj)], `${title}.json`, { type: 'application/json' });
        }

        setUploadState(s => ({ ...s, uploading: true, error: null }));
        try {
            const form = new FormData();
            form.append('title', uploadTitle.trim());
            if (swaraAudio) form.append('swaraAudio', swaraAudio);
            if (sahityaAudio) form.append('sahityaAudio', sahityaAudio);
            // Only attach a JSON when we actually have one. PDF-only uploads
            // let the server synthesize an empty composition.
            if (finalJsonFile) form.append('json', finalJsonFile);
            if (pdfFile) form.append('pdf', pdfFile);
            if (needsManualMeta) {
                form.append('raga', metaRaga.trim());
                form.append('tala', metaTala.trim());
                if (metaComposer.trim()) form.append('composer', metaComposer.trim());
            }
            const res = await fetch('/api/songs/upload', { method: 'POST', body: form });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const newSong = await res.json();
            setSongs(prev => [newSong, ...prev]);
            setShowUpload(false);
            setUploadState({ swaraAudio: null, sahityaAudio: null, jsonFile: null, pdfFile: null, uploading: false, error: null });
            setUploadTitle('');
            setUploadMode('file');
            setAutoRaga(''); setAutoTala(''); setAutoComposer('');
        } catch (e) {
            setUploadState(s => ({ ...s, uploading: false, error: e.message }));
        }
    };

    const fmt = (iso) => {
        if (!iso) return '';
        try {
            return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
        } catch {
            return iso;
        }
    };

    // Computed filtered songs
    const filteredSongs = songs.filter(s => {
        const matchesTitle = !filterTitle || s.title.toLowerCase().includes(filterTitle.toLowerCase());
        const matchesRaga = filterRagas.length === 0 || filterRagas.includes(s.raga);
        const matchesTala = filterTalas.length === 0 || filterTalas.includes(s.tala);
        const matchesComposer = filterComposers.length === 0 || filterComposers.includes(s.composer || 'Unknown');
        return matchesTitle && matchesRaga && matchesTala && matchesComposer;
    });

    const sortedSongs = [...filteredSongs].sort((a, b) => {
        switch (sortBy) {
            case 'date-desc': return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date-asc': return new Date(a.createdAt) - new Date(b.createdAt);
            case 'title-asc': return (a.title || '').localeCompare(b.title || '');
            case 'title-desc': return (b.title || '').localeCompare(a.title || '');
            case 'updated-desc': return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
            default: return 0;
        }
    });

    const handleToggleFavorite = async (song) => {
        const newFav = !song.isFavorite;
        try {
            const res = await fetch(`/api/songs/${song.id}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    raga: song.raga, 
                    tala: song.tala,
                    isFavorite: newFav 
                })
            });
            const data = await res.json();
            if (data.ok) {
                setSongs(prev => prev.map(s => s.id === song.id ? { ...s, isFavorite: newFav } : s));
            }
        } catch (e) {
            console.error('Failed toggling favorite:', e);
        }
    };

    const handleBulkPublish = async (active) => {
        if (!window.confirm(`${active ? 'Publish' : 'Unpublish' } all ${filteredSongs.length} filtered songs?`)) return;
        setBulkPublishing(true);
        try {
            for (const song of filteredSongs) {
                if (song.isPublished === active) continue;
                await fetch(`/api/songs/${song.id}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isPublished: active }) 
                });
            }
            fetchSongs();
        } catch (e) {
            alert('Bulk update failed: ' + e.message);
        } finally {
            setBulkPublishing(false);
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <header
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{
                    background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(248,250,252,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                    >
                        <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <div>
                        <h1 className="font-bold text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>Song Editor</h1>
                        <p className="text-[10px] uppercase tracking-widest opacity-50">Manage your compositions</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                    }}
                >
                    <Plus className="w-4 h-4" />
                    Add Song
                </button>
            </header>

            {/* Filter Bar */}
            <div 
                className="px-6 py-4 border-b flex flex-col md:flex-row items-center gap-4 sticky top-0 z-10"
                style={{ 
                    background: isDark ? 'rgba(10,10,15,0.6)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    borderColor 
                }}
            >
                {/* Search Title */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                        type="text"
                        value={filterTitle}
                        onChange={e => setFilterTitle(e.target.value)}
                        placeholder="Search songs..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        style={{ 
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                            borderColor,
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                {/* Multi-Selects */}
                <div className="flex flex-1 items-center gap-2 w-full md:w-auto overflow-visible">
                    <MultiSelectSearchableDropdown
                        label="Raga"
                        selected={filterRagas}
                        onChange={setFilterRagas}
                        options={allRagas}
                        isDark={isDark}
                        borderColor={borderColor}
                        icon={Music}
                    />
                    <MultiSelectSearchableDropdown
                        label="Tala"
                        selected={filterTalas}
                        onChange={setFilterTalas}
                        options={allTalas}
                        isDark={isDark}
                        borderColor={borderColor}
                        icon={Layout}
                    />
                    <MultiSelectSearchableDropdown
                        label="Composer"
                        selected={filterComposers}
                        onChange={setFilterComposers}
                        options={allComposers}
                        isDark={isDark}
                        borderColor={borderColor}
                        icon={Pencil}
                    />
                    
                    {(filterTitle || filterRagas.length > 0 || filterTalas.length > 0 || filterComposers.length > 0) && (
                        <button
                            onClick={() => {
                                setFilterTitle('');
                                setFilterRagas([]);
                                setFilterTalas([]);
                                setFilterComposers([]);
                            }}
                            className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-500 transition-colors whitespace-nowrap"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Bulk Actions & Sort */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <SortDropdown value={sortBy} onChange={setSortBy} isDark={isDark} borderColor={borderColor} />

                    <div className="flex items-center gap-1.5 ml-2 border-l pl-4" style={{ borderColor }}>
                        <button
                            onClick={() => handleBulkPublish(true)}
                            disabled={bulkPublishing || filteredSongs.length === 0}
                            className="px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-500 hover:text-white hover:border-emerald-500 disabled:opacity-30 flex items-center gap-2 shadow-sm"
                            style={{ borderColor, color: 'var(--text-muted)', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                        >
                            <Globe className="w-3 h-3" />
                            Publish
                        </button>
                        <button
                            onClick={() => handleBulkPublish(false)}
                            disabled={bulkPublishing || filteredSongs.length === 0}
                            className="px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-30 flex items-center gap-2 shadow-sm"
                            style={{ borderColor, color: 'var(--text-muted)', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                        >
                            <X className="w-3 h-3" />
                            Unpublish
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={fetchSongs} className="text-xs text-emerald-400 underline">Retry</button>
                    </div>
                ) : songs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 gap-4 opacity-50">
                        <Music className="w-16 h-16" />
                        <p className="text-lg font-bold">No songs yet</p>
                        <p className="text-sm">Click "Add Song" to upload an audio file and JSON composition.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedSongs.map(song => (
                            <div
                                key={song.id}
                                className="group relative rounded-2xl p-5 border transition-all hover:scale-[1.01]"
                                style={{
                                    background: isDark ? 'var(--glass-bg)' : '#fff',
                                    borderColor,
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                {/* Composition Type Banner — hangs from the top of the card like a fabric flag */}
                                <TypeBanner song={song} color={typeColor(song.compositionType)} />

                                {/* Title */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        {renamingId === song.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    ref={renameInputRef}
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitRename(song.id);
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                    onBlur={() => commitRename(song.id)}
                                                    className="flex-1 min-w-0 font-bold text-base rounded-lg px-2 py-0.5"
                                                    style={{
                                                        fontFamily: "'Outfit', sans-serif",
                                                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                                        border: '1px solid rgba(16,185,129,0.4)',
                                                        outline: 'none',
                                                        color: 'var(--text-primary)',
                                                    }}
                                                    autoFocus
                                                />
                                                <button onClick={() => commitRename(song.id)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0"
                                                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 group/title">
                                            <h3
                                                className="font-bold text-base truncate cursor-text text-[var(--text-primary)] group-hover/title:text-emerald-400 transition-colors"
                                                style={{ fontFamily: "'Outfit', sans-serif" }}
                                                title="Click to rename"
                                                onClick={() => startRename(song)}
                                            >
                                                {song.title}
                                            </h3>
                                            <button
                                                onClick={() => startRename(song)}
                                                className="opacity-0 group-hover/title:opacity-40 hover:!opacity-100 transition-opacity flex-shrink-0"
                                                title="Rename"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </div>
                                        )}
                                        {editingMetaId === song.id ? (
                                            <div className="mt-2 space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <SearchableSelect
                                                        label="Ragam *"
                                                        value={editRaga}
                                                        onChange={setEditRaga}
                                                        options={allRagas}
                                                        isDark={isDark}
                                                        borderColor={borderColor}
                                                    />
                                                    <SearchableSelect
                                                        label="Talam *"
                                                        value={editTala}
                                                        onChange={setEditTala}
                                                        options={allTalas}
                                                        isDark={isDark}
                                                        borderColor={borderColor}
                                                    />
                                                </div>
                                                <SearchableSelect
                                                    label="Composer"
                                                    value={editComposer}
                                                    onChange={setEditComposer}
                                                    options={allComposers}
                                                    isDark={isDark}
                                                    borderColor={borderColor}
                                                />
                                                <SearchableSelect
                                                    label="Type"
                                                    value={editType}
                                                    onChange={setEditType}
                                                    options={COMPOSITION_TYPES}
                                                    isDark={isDark}
                                                    borderColor={borderColor}
                                                />
                                                <div className="flex items-center gap-2 pt-1">
                                                    <button
                                                        onClick={() => commitMetaEdit(song.id)}
                                                        disabled={!editRaga.trim() || !editTala.trim()}
                                                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30"
                                                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                                                    >
                                                        <Check className="w-3 h-3" /> Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingMetaId(null)}
                                                        className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                                                        style={{ color: 'var(--text-muted)' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5 mb-2">
                                                <div className="flex flex-wrap gap-4 text-[13px] font-bold uppercase tracking-wider">
                                                    {song.raga && (
                                                        <span className="flex items-center gap-1.5 grayscale-[0.3]">
                                                            <span className="opacity-40 font-black">Raga: </span>
                                                            <span style={{ color: '#10b981' }}>{song.raga}</span>
                                                        </span>
                                                    )}
                                                    {song.tala && (
                                                        <span className="flex items-center gap-1.5 grayscale-[0.3]">
                                                            <span className="opacity-40 font-black">Tala: </span>
                                                            <span style={{ color: '#60a5fa' }}>{song.tala}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {song.composer && song.composer !== 'Traditional' && song.composer !== 'Unknown' && (
                                                    <div className="text-[13px] font-bold uppercase tracking-wider">
                                                        <span className="opacity-40 font-black">Composer: </span>
                                                        <span style={{ color: '#fbbf24' }}>{song.composer}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-3 mb-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {fmt(song.updatedAt)}
                                    </span>
                                    {song.versionCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Layers className="w-3 h-3" />
                                            {song.versionCount} version{song.versionCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(song); }}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${song.isFavorite ? 'bg-rose-500/10 border-rose-500/40 text-rose-500' : 'bg-black/5 border-white/10 text-[var(--text-muted)] hover:bg-rose-500/5 hover:border-rose-500/30 hover:text-rose-400'}`}
                                        title={song.isFavorite ? "Remove from Favorites" : "Mark as Favorite"}
                                    >
                                        <Heart className={`w-4 h-4 ${song.isFavorite ? 'fill-rose-500' : ''}`} />
                                    </button>

                                    <button
                                        onClick={() => startMetaEdit(song)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:border-blue-500/40 hover:bg-blue-500/10"
                                        style={{ borderColor }}
                                        title="Edit Info"
                                    >
                                        <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </button>

                                    {/* Direct PDF link (no hover popup) */}
                                    {song.pdfPath && (
                                        <a
                                            href={`/api/${song.pdfPath}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:border-orange-500/40 hover:bg-orange-500/10"
                                            style={{ borderColor }}
                                            title="View PDF Notation"
                                        >
                                            <FileText className="w-4 h-4 text-orange-400" />
                                        </a>
                                    )}

                                    <button
                                        onClick={() => togglePublish(song.id, song.isPublished)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all border ${song.isPublished ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'border-transparent bg-black/5 text-[var(--text-muted)] hover:bg-black/10 hover:text-[var(--text-primary)]'} ${isDark && !song.isPublished ? 'bg-white/5 hover:bg-white/10' : ''}`}
                                        title={song.isPublished ? "Unpublish from Home Page" : "Publish to Home Page"}
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        {song.isPublished ? 'Published' : 'Publish'}
                                    </button>
                                    <button
                                        onClick={() => onEditSong(song.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#fff',
                                        }}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(song.id, song.title)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:border-red-500/40 hover:bg-red-500/10"
                                        style={{ borderColor }}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}
                >
                    <div
                        className="w-full max-w-md rounded-3xl p-6 border"
                        style={{
                            background: isDark ? '#141420' : '#fff',
                            borderColor,
                        }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                {uploadMode === 'manual' ? 'Add New Song (without Lyrics)' : 'Add New Song'}
                            </h2>
                            <button onClick={() => { setShowUpload(false); setUploadMode('file'); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex p-1 rounded-2xl mb-6" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            <button
                                onClick={() => setUploadMode('file')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${uploadMode === 'file' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
                            >
                                Auto Setup
                            </button>
                            <button
                                onClick={() => setUploadMode('manual')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${uploadMode === 'manual' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
                            >
                                Manual Setup
                            </button>
                        </div>

                        {/* Song Title */}
                        <div className="mb-5">
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Song Title</label>
                            <input
                                type="text"
                                value={uploadTitle}
                                onChange={(e) => { setUploadTitle(e.target.value); setUploadState(s => ({ ...s, error: null })); }}
                                placeholder="Enter song name..."
                                className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>

                        {/* Audio files */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">1a. Swara Audio</label>
                                <button
                                    onClick={() => swaraInputRef.current?.click()}
                                    className="w-full flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-dashed transition-all group"
                                    style={{
                                        borderColor: uploadState.swaraAudio ? 'rgba(16,185,129,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                        background: uploadState.swaraAudio ? 'rgba(16,185,129,0.05)' : 'transparent',
                                    }}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${uploadState.swaraAudio ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="text-center min-w-0 w-full">
                                        <div className={`text-[11px] font-bold truncate ${uploadState.swaraAudio ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                            {uploadState.swaraAudio ? uploadState.swaraAudio.name : 'Select Swara'}
                                        </div>
                                    </div>
                                </button>
                                <input
                                    ref={swaraInputRef}
                                    type="file"
                                    accept="audio/*,.mp3"
                                    className="hidden"
                                    onChange={(e) => setUploadState(s => ({ ...s, swaraAudio: e.target.files[0] || null, error: null }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">1b. Sahitya Audio</label>
                                <button
                                    onClick={() => sahityaInputRef.current?.click()}
                                    className="w-full flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-dashed transition-all group"
                                    style={{
                                        borderColor: uploadState.sahityaAudio ? 'rgba(6,182,212,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                        background: uploadState.sahityaAudio ? 'rgba(6,182,212,0.05)' : 'transparent',
                                    }}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${uploadState.sahityaAudio ? 'bg-cyan-500/20 text-cyan-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="text-center min-w-0 w-full">
                                        <div className={`text-[11px] font-bold truncate ${uploadState.sahityaAudio ? 'text-cyan-500' : 'text-[var(--text-primary)]'}`}>
                                            {uploadState.sahityaAudio ? uploadState.sahityaAudio.name : 'Select Sahitya'}
                                        </div>
                                    </div>
                                </button>
                                <input
                                    ref={sahityaInputRef}
                                    type="file"
                                    accept="audio/*,.mp3"
                                    className="hidden"
                                    onChange={(e) => setUploadState(s => ({ ...s, sahityaAudio: e.target.files[0] || null, error: null }))}
                                />
                            </div>
                        </div>

                        {uploadMode === 'file' ? (
                            /* Auto Setup — half/half JSON + PDF pickers */
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-50">Composition Source (JSON, PDF, or both)</label>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                                        style={{ borderColor, color: 'var(--text-muted)' }}
                                        title="Download a sample composition JSON you can edit and re-upload"
                                    >
                                        <Download className="w-3 h-3" />
                                        Template
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* JSON picker */}
                                    <button
                                        onClick={() => jsonInputRef.current?.click()}
                                        className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-dashed transition-all group"
                                        style={{
                                            borderColor: uploadState.jsonFile ? 'rgba(16,185,129,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                            background: uploadState.jsonFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                                        }}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${uploadState.jsonFile ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                            <FileJson className="w-5 h-5" />
                                        </div>
                                        <div className="text-center min-w-0 w-full">
                                            <div className={`text-[11px] font-bold truncate ${uploadState.jsonFile ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                                {uploadState.jsonFile ? uploadState.jsonFile.name : 'Select JSON'}
                                            </div>
                                            <div className="text-[9px] opacity-40 uppercase tracking-tight mt-0.5">Full notation</div>
                                        </div>
                                    </button>
                                    <input
                                        ref={jsonInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        className="hidden"
                                        onChange={(e) => setUploadState(s => ({ ...s, jsonFile: e.target.files[0] || null, error: null }))}
                                    />

                                    {/* PDF picker */}
                                    <button
                                        onClick={() => pdfInputRef.current?.click()}
                                        className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-dashed transition-all group"
                                        style={{
                                            borderColor: uploadState.pdfFile ? 'rgba(249,115,22,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                            background: uploadState.pdfFile ? 'rgba(249,115,22,0.05)' : 'transparent',
                                        }}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${uploadState.pdfFile ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                            {pdfParsing
                                                ? <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                : <FileText className="w-5 h-5" />}
                                        </div>
                                        <div className="text-center min-w-0 w-full">
                                            <div className={`text-[11px] font-bold truncate ${uploadState.pdfFile ? 'text-orange-500' : 'text-[var(--text-primary)]'}`}>
                                                {uploadState.pdfFile ? uploadState.pdfFile.name : 'Select PDF'}
                                            </div>
                                            <div className="text-[9px] opacity-40 uppercase tracking-tight mt-0.5">
                                                {pdfParsing ? 'Reading metadata…' : 'Sheet music'}
                                            </div>
                                        </div>
                                    </button>
                                    <input
                                        ref={pdfInputRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={(e) => handlePdfPicked(e.target.files[0] || null)}
                                    />
                                </div>

                                {/* PDF without JSON: surface raga/tala selectors so the server
                                    has enough metadata to synthesize a starter composition. */}
                                {uploadState.pdfFile && !uploadState.jsonFile && (
                                    <div className="mt-4 space-y-4 p-3 rounded-2xl border" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">
                                            PDF only — please specify metadata
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <SearchableSelect
                                                label="Ragam *"
                                                value={autoRaga}
                                                onChange={setAutoRaga}
                                                options={allRagas}
                                                isDark={isDark}
                                                borderColor={borderColor}
                                            />
                                            <SearchableSelect
                                                label="Talam *"
                                                value={autoTala}
                                                onChange={setAutoTala}
                                                options={allTalas}
                                                isDark={isDark}
                                                borderColor={borderColor}
                                            />
                                        </div>
                                        <SearchableSelect
                                            label="Composer"
                                            value={autoComposer}
                                            onChange={setAutoComposer}
                                            options={allComposers}
                                            isDark={isDark}
                                            borderColor={borderColor}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Manual Setup */
                            <div className="space-y-6 mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <SearchableSelect
                                        label="Ragam *"
                                        value={manualRaga}
                                        onChange={setManualRaga}
                                        options={allRagas}
                                        isDark={isDark}
                                        borderColor={borderColor}
                                    />
                                    <SearchableSelect
                                        label="Talam *"
                                        value={manualTala}
                                        onChange={setManualTala}
                                        options={allTalas}
                                        isDark={isDark}
                                        borderColor={borderColor}
                                        formatOption={(t) => {
                                            const template = TALA_TEMPLATES[t];
                                            if (template) {
                                                const beats = template.split('_').length - 1;
                                                return `${t} (${beats})`;
                                            }
                                            return t;
                                        }}
                                    />
                                </div>
                                <SearchableSelect
                                    label="Composer"
                                    value={manualComposer}
                                    onChange={setManualComposer}
                                    options={allComposers}
                                    isDark={isDark}
                                    borderColor={borderColor}
                                />
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Sections to Generate</label>
                                    <div className="flex flex-wrap gap-2">
                                        {STANDARD_SECTIONS.map(s => {
                                            const active = manualSections.includes(s);
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => setManualSections(prev =>
                                                        active ? prev.filter(x => x !== s) : [...prev, s]
                                                    )}
                                                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'text-[var(--text-muted)] hover:border-emerald-500/30'}`}
                                                    style={{ borderColor: active ? undefined : borderColor }}
                                                >
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                        {uploadState.error && (
                            <p className="text-red-400 text-xs mb-4 px-1">{uploadState.error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowUpload(false); setUploadState({ swaraAudio: null, sahityaAudio: null, jsonFile: null, pdfFile: null, uploading: false, error: null }); setAutoRaga(''); setAutoTala(''); setAutoComposer(''); }}
                                className="flex-1 py-3 rounded-xl border font-bold text-sm transition-all"
                                style={{ borderColor, color: 'var(--text-muted)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUploadSubmit}
                                disabled={uploadState.uploading}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                            >
                                {uploadState.uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
