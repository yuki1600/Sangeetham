import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Music, Pencil, Trash2, Clock, Layers, Upload, X, FileAudio, FileJson, Check, Globe } from 'lucide-react';

export default function SongEditor({ theme, onEditSong, onBack }) {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadState, setUploadState] = useState({ audioFile: null, jsonFile: null, uploading: false, error: null });
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);
    const audioInputRef = useRef(null);
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
        const { audioFile, jsonFile } = uploadState;
        if (!audioFile || !jsonFile) {
            setUploadState(s => ({ ...s, error: 'Please select both an audio file and a JSON file.' }));
            return;
        }
        setUploadState(s => ({ ...s, uploading: true, error: null }));
        try {
            const form = new FormData();
            form.append('audio', audioFile);
            form.append('json', jsonFile);
            const res = await fetch('/api/songs/upload', { method: 'POST', body: form });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Upload failed');
            }
            const newSong = await res.json();
            setSongs(prev => [newSong, ...prev]);
            setShowUpload(false);
            setUploadState({ audioFile: null, jsonFile: null, uploading: false, error: null });
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
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {song.raga && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                                    {song.raga}
                                                </span>
                                            )}
                                            {song.tala && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                                                    {song.tala}
                                                </span>
                                            )}
                                        </div>
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
                            <button onClick={() => setShowUpload(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Audio file */}
                        <div className="mb-4">
                            <label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-60">Audio File (.mp3)</label>
                            <button
                                onClick={() => audioInputRef.current?.click()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all"
                                style={{
                                    borderColor: uploadState.audioFile ? '#10b981' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                                    background: uploadState.audioFile ? 'rgba(16,185,129,0.08)' : 'transparent',
                                }}
                            >
                                <FileAudio className="w-5 h-5" style={{ color: uploadState.audioFile ? '#10b981' : 'var(--text-muted)' }} />
                                <span className="text-sm truncate" style={{ color: uploadState.audioFile ? '#10b981' : 'var(--text-muted)' }}>
                                    {uploadState.audioFile ? uploadState.audioFile.name : 'Click to select audio file'}
                                </span>
                            </button>
                            <input
                                ref={audioInputRef}
                                type="file"
                                accept="audio/*,.mp3"
                                className="hidden"
                                onChange={(e) => setUploadState(s => ({ ...s, audioFile: e.target.files[0] || null, error: null }))}
                            />
                        </div>

                        {/* JSON file */}
                        <div className="mb-5">
                            <label className="block text-xs font-black uppercase tracking-widest mb-2 opacity-60">Composition JSON (.json)</label>
                            <button
                                onClick={() => jsonInputRef.current?.click()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all"
                                style={{
                                    borderColor: uploadState.jsonFile ? '#10b981' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                                    background: uploadState.jsonFile ? 'rgba(16,185,129,0.08)' : 'transparent',
                                }}
                            >
                                <FileJson className="w-5 h-5" style={{ color: uploadState.jsonFile ? '#10b981' : 'var(--text-muted)' }} />
                                <span className="text-sm truncate" style={{ color: uploadState.jsonFile ? '#10b981' : 'var(--text-muted)' }}>
                                    {uploadState.jsonFile ? uploadState.jsonFile.name : 'Click to select JSON file'}
                                </span>
                            </button>
                            <input
                                ref={jsonInputRef}
                                type="file"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={(e) => setUploadState(s => ({ ...s, jsonFile: e.target.files[0] || null, error: null }))}
                            />
                        </div>

                        {uploadState.error && (
                            <p className="text-red-400 text-xs mb-4 px-1">{uploadState.error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowUpload(false); setUploadState({ audioFile: null, jsonFile: null, uploading: false, error: null }); }}
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
