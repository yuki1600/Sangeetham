import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Music, Pencil, Trash2, Clock, Layers, Upload, X, FileAudio, FileJson, Check, Globe, Layout, Search, ChevronDown, Settings } from 'lucide-react';
import { TALA_TEMPLATES, STANDARD_SECTIONS, generateCompositionTemplate } from '../../utils/talaTemplates';
import { ALL_SONGS } from '../../utils/carnaticData';

function SearchableSelect({ label, value, onChange, options, isDark, borderColor, formatOption }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    placeholder={`Select or type ${label.toLowerCase()}...`}
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

export default function SongEditor({ theme, onEditSong, onBack }) {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadState, setUploadState] = useState({ 
        swaraAudio: null, 
        sahityaAudio: null, 
        jsonFile: null, 
        uploading: false, 
        error: null 
    });
    const [uploadMode, setUploadMode] = useState('manual'); // 'file' | 'manual'
    const [uploadTitle, setUploadTitle] = useState('');
    const [manualRaga, setManualRaga] = useState('');
    const [manualTala, setManualTala] = useState('Adi');
    const [manualComposer, setManualComposer] = useState('');
    const [manualSections, setManualSections] = useState(['Pallavi', 'Anupallavi', 'Charanam']);

    const EXPANDED_RAGAM_LIST = [
        'Abhogi', 'Anandabhairavi', 'Arabhi', 'Asaveri', 'Atana', 'Bhairavi', 'Bilahari', 'Bowli', 
        'Brindavani', 'Chakravakam', 'Chalanaata', 'Charukesi', 'Darbar', 'Dhanyasi', 'Dharmavati', 
        'Gaurimanohari', 'Gowlai', 'Hamsadhwani', 'Hamsanadam', 'Hari Kambodhi', 'Hindolam', 
        'Kalyani', 'Kambodhi', 'Kamas', 'Kanada', 'Kapi', 'Kedaragowla', 'Keeravani', 'Kharaharapriya', 
        'Latangi', 'Madhyamavati', 'Malahari', 'Mayamalavagowlai', 'Mohanam', 'Mukhari', 'Nalinakanthi', 
        'Nattai', 'Navaroj', 'Pantuvarali', 'Poorvikalyani', 'Punnagavarali', 'Reethigowlai', 'Revathi', 
        'Saaranga', 'Sahana', 'Sama', 'Saveri', 'Shankarabharanam', 'Shanmukhapriya', 'Simhendramadhyamam', 
        'Sindhu Bhairavi', 'Sri', 'Sri Ranjani', 'Subhapantuvarali', 'Suddha Dhanyasi', 'Suddha Saveri', 
        'Surutti', 'Thodi', 'Vachaspati', 'Varali', 'Vasanta', 'Yadukula Kambodhi'
    ];

    const allRagas = [...new Set([...EXPANDED_RAGAM_LIST, ...ALL_SONGS.map(s => s.raga).filter(r => r && r !== 'All Ragas')])].sort();
    const allTalas = [...new Set([...Object.keys(TALA_TEMPLATES), ...ALL_SONGS.map(s => s.tala).filter(Boolean)])].sort();
    
    // Process composers: alphabetize all, but pull 'Unknown' to the top
    const processedComposers = [...new Set(ALL_SONGS.map(s => s.composer).filter(Boolean))].sort();
    const allComposers = processedComposers.includes('Unknown') 
        ? ['Unknown', ...processedComposers.filter(c => c !== 'Unknown')] 
        : processedComposers;
        
    const [editingMetaId, setEditingMetaId] = useState(null);
    const [editRaga, setEditRaga] = useState('');
    const [editTala, setEditTala] = useState('');
    const [editComposer, setEditComposer] = useState('');

    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);
    const swaraInputRef = useRef(null);
    const sahityaInputRef = useRef(null);
    const jsonInputRef = useRef(null);

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
    };

    const commitMetaEdit = async (id) => {
        if (!editRaga.trim() || !editTala.trim()) return;
        try {
            const res = await fetch(`/api/songs/${id}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raga: editRaga.trim(), tala: editTala.trim(), composer: editComposer.trim() }),
            });
            if (!res.ok) throw new Error('Update failed');
            const data = await res.json();
            setSongs(prev => prev.map(s => s.id === id ? { ...s, raga: data.raga, tala: data.tala, composer: data.composer } : s));
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
        const { swaraAudio, sahityaAudio, jsonFile } = uploadState;
        if (!uploadTitle.trim()) {
            setUploadState(s => ({ ...s, error: 'Please enter a song title.' }));
            return;
        }
        if (!swaraAudio && !sahityaAudio) {
            setUploadState(s => ({ ...s, error: 'Please select at least one audio file (Swara or Sahitya).' }));
            return;
        }
        if (uploadMode === 'manual') {
            if (!manualRaga.trim()) {
                setUploadState(s => ({ ...s, error: 'Ragam is required.' }));
                return;
            }
            if (!manualTala.trim()) {
                setUploadState(s => ({ ...s, error: 'Talam is required.' }));
                return;
            }
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
        } else if (!jsonFile) {
            setUploadState(s => ({ ...s, error: 'Please select a JSON composition file.' }));
            return;
        }

        setUploadState(s => ({ ...s, uploading: true, error: null }));
        try {
            const form = new FormData();
            form.append('title', uploadTitle.trim());
            if (swaraAudio) form.append('swaraAudio', swaraAudio);
            if (sahityaAudio) form.append('sahityaAudio', sahityaAudio);
            form.append('json', finalJsonFile);
            if (uploadMode === 'manual') {
                form.append('raga', manualRaga.trim());
                form.append('tala', manualTala.trim());
                if (manualComposer.trim()) form.append('composer', manualComposer.trim());
            }
            const res = await fetch('/api/songs/upload', { method: 'POST', body: form });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const newSong = await res.json();
            setSongs(prev => [newSong, ...prev]);
            setShowUpload(false);
            setUploadState({ swaraAudio: null, sahityaAudio: null, jsonFile: null, uploading: false, error: null });
            setUploadTitle('');
            setUploadMode('file');
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
                        {songs.map(song => (
                            <div
                                key={song.id}
                                className="group relative rounded-2xl p-5 border transition-all hover:scale-[1.01]"
                                style={{
                                    background: isDark ? 'var(--glass-bg)' : '#fff',
                                    borderColor,
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
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
                                                    className="font-bold text-base truncate cursor-text"
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
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                                    {song.raga && (
                                                        <span>
                                                            <span className="opacity-40">Raga: </span>
                                                            <span style={{ color: '#10b981' }}>{song.raga}</span>
                                                        </span>
                                                    )}
                                                    {song.tala && (
                                                        <span>
                                                            <span className="opacity-40">Tala: </span>
                                                            <span style={{ color: '#60a5fa' }}>{song.tala}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {song.composer && song.composer !== 'Traditional' && song.composer !== 'Unknown' && (
                                                    <div className="text-[10px] font-bold uppercase tracking-widest">
                                                        <span className="opacity-40">Composer: </span>
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
                                        onClick={() => startMetaEdit(song)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:border-blue-500/40 hover:bg-blue-500/10"
                                        style={{ borderColor }}
                                        title="Edit Info"
                                    >
                                        <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </button>
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
                            <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Add New Song</h2>
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
                            /* JSON file upload */
                            <div className="mb-6">
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Composition JSON</label>
                                <button
                                    onClick={() => jsonInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed transition-all group"
                                    style={{
                                        borderColor: uploadState.jsonFile ? 'rgba(16,185,129,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                        background: uploadState.jsonFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                                    }}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${uploadState.jsonFile ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-[var(--text-muted)]'}`}>
                                        <FileJson className="w-5 h-5" />
                                    </div>
                                    <div className="text-left min-w-0 flex-1">
                                        <div className={`text-sm font-bold truncate ${uploadState.jsonFile ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                            {uploadState.jsonFile ? uploadState.jsonFile.name : 'Select JSON File'}
                                        </div>
                                        <div className="text-[10px] opacity-40 uppercase tracking-tight">Full track notation</div>
                                    </div>
                                </button>
                                <input
                                    ref={jsonInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden"
                                    onChange={(e) => setUploadState(s => ({ ...s, jsonFile: e.target.files[0] || null, error: null }))}
                                />
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
                                onClick={() => { setShowUpload(false); setUploadState({ swaraAudio: null, sahityaAudio: null, jsonFile: null, uploading: false, error: null }); }}
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
