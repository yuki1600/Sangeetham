import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Music2, Globe, Disc3, Pencil, Search, Heart, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '../utils/api';

// Per-type accent colors so the small banner on each card matches the
// learning-path categories on the left rail.
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

/**
 * SongsPanel — shows published community songs dynamically from the backend.
 * Includes search and tabbed navigation between Favorites and Library.
 */
export default function SongsPanel({ onSelectSong, onEditSong, onViewAll }) {
    const [allSongs, setAllSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'library'

    useEffect(() => {
        setIsLoading(true);
        fetch(apiUrl('/api/songs'))
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filter published songs only for basic dashboard
                    const published = data.filter(s => s.isPublished);
                    published.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    setAllSongs(published);
                }
            })
            .catch(e => console.error('Failed fetching published songs:', e))
            .finally(() => setIsLoading(false));
    }, []);

    const baseSongs = useMemo(() => {
        return activeTab === 'favorites'
            ? allSongs.filter(s => s.isFavorite)
            : allSongs;
    }, [allSongs, activeTab]);

    const filteredSongs = useMemo(() => {
        if (!searchQuery.trim()) return baseSongs;
        const q = searchQuery.toLowerCase();
        return baseSongs.filter(s =>
            (s.title || '').toLowerCase().includes(q)
        );
    }, [baseSongs, searchQuery]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/20 flex items-center justify-center backdrop-blur-md bg-emerald-500/5">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin opacity-40" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[var(--bg-primary)] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 animate-pulse">Syncing Library</p>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">Fetching latest recordings...</p>
            </div>
        </div>
    );

    // Animation Variants
    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.04, delayChildren: 0.1 }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="fade-in mb-8 flex flex-col gap-8">
            {/* Header & Tabs Container */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                {/* Custom Tab Switcher with Sliding Highlight */}
                <div className="relative flex p-1 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] w-fit overflow-hidden" style={{ backdropFilter: 'blur(12px)' }}>
                    <button
                        onClick={() => { setActiveTab('favorites'); setSearchQuery(''); }}
                        className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
                            activeTab === 'favorites' ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {activeTab === 'favorites' && (
                            <motion.div
                                layoutId="activeTabHighlight"
                                className="absolute inset-0 bg-rose-500 rounded-xl -z-10 shadow-lg shadow-rose-500/25"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            />
                        )}
                        <Heart className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'fill-white' : 'opacity-40'}`} />
                        Favorites
                    </button>
                    <button
                        onClick={() => { setActiveTab('library'); setSearchQuery(''); }}
                        className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
                            activeTab === 'library' ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {activeTab === 'library' && (
                            <motion.div
                                layoutId="activeTabHighlight"
                                className="absolute inset-0 bg-emerald-500 rounded-xl -z-10 shadow-lg shadow-emerald-500/25"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            />
                        )}
                        <Globe className={`w-3.5 h-3.5 ${activeTab === 'library' ? '' : 'opacity-40'}`} />
                        Library
                    </button>
                </div>

                {/* Contextual Search Bar */}
                <div className="relative w-full md:w-80 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                        activeTab === 'favorites'
                            ? 'text-rose-500 group-focus-within:text-rose-400'
                            : 'text-emerald-500 group-focus-within:text-emerald-400'
                    } opacity-60`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search in ${activeTab}...`}
                        className={`w-full pl-11 pr-5 py-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm transition-all focus:outline-none focus:ring-4 ${
                            activeTab === 'favorites' ? 'focus:ring-rose-500/10 focus:border-rose-500/30' : 'focus:ring-emerald-500/10 focus:border-emerald-500/30'
                        }`}
                        style={{ backdropFilter: 'blur(12px)' }}
                    />
                </div>
            </div>

            {/* Content Section with Seamless Height Transition */}
            <motion.section
                layout
                className="flex flex-col min-h-[400px]"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="flex items-center gap-2 mb-6 px-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                        >
                            {activeTab === 'favorites' ? (
                                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                            ) : (
                                <Globe className="w-4 h-4 text-emerald-500" />
                            )}
                            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em]">
                                {activeTab === 'favorites' ? 'Curated Favorites' : 'Full Library Catalog'} ({filteredSongs.length})
                            </h3>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab + searchQuery}
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="grid gap-3"
                    >
                        {filteredSongs.length > 0 ? (
                            filteredSongs.map(song => (
                                <motion.div key={`${activeTab}-${song.id}`} variants={cardVariants}>
                                    <SongCard
                                        song={song}
                                        onSelectSong={onSelectSong}
                                        onEditSong={onEditSong}
                                        setAllSongs={setAllSongs}
                                    />
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-[var(--glass-border)] bg-black/5"
                            >
                                <Music2 className="w-10 h-10 text-[var(--text-muted)] mb-4 opacity-10" />
                                <p className="text-[var(--text-muted)] text-sm font-medium italic opacity-60">
                                    {searchQuery ? `No results for "${searchQuery}" in ${activeTab}` : `Your ${activeTab} is currently empty`}
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                    {activeTab === 'library' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex justify-center mt-12 pb-8"
                        >
                            <button
                                onClick={onViewAll}
                                className="group px-8 py-3.5 rounded-2xl bg-emerald-500 border border-emerald-600 text-white text-[11px] font-black hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 flex items-center gap-3"
                            >
                                <Plus className="w-4 h-4" />
                                Manage Library
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.section>
        </div>
    );
}

/**
 * Reusable Song Card Component
 */
function SongCard({ song, onSelectSong, onEditSong, setAllSongs }) {
    const accent = typeColor(song.compositionType);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectSong({
                ...song,
                songViewId: song.id,
                jsonUrl: apiUrl(`/api/songs/${song.id}`),
                audioUrl: apiUrl(`/api/songs/${song.id}/audio`),
                isDynamic: true
            })}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSong({
                        ...song,
                        songViewId: song.id,
                        jsonUrl: apiUrl(`/api/songs/${song.id}`),
                        audioUrl: apiUrl(`/api/songs/${song.id}/audio`),
                        isDynamic: true
                    });
                }
            }}
            className="w-full group relative overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] p-5 text-left transition-all duration-400 hover:border-emerald-500/30 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] cursor-pointer"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <Disc3 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-lg font-bold text-[var(--text-primary)] truncate group-hover:text-emerald-400 transition-colors tracking-tight">
                                {song.title}
                            </h4>
                            {song.compositionType && (
                                <span
                                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] flex-shrink-0"
                                    style={{
                                        background: `${accent}1f`,
                                        color: accent,
                                        border: `1px solid ${accent}40`,
                                    }}
                                >
                                    {song.compositionType}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 group-hover:border-emerald-500/20 transition-colors">
                                    <span className="opacity-30 uppercase tracking-[0.15em] font-black text-[9px]">Raga</span>
                                    <span className="text-[13px] font-bold text-emerald-400/90">{song.raga || 'Other'}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 group-hover:border-teal-500/20 transition-colors">
                                    <span className="opacity-30 uppercase tracking-[0.15em] font-black text-[9px]">Tala</span>
                                    <span className="text-[13px] font-bold text-teal-400/90">{song.tala || 'Other'}</span>
                                </div>
                            </div>
                            {song.composer && song.composer !== 'Traditional' && song.composer !== 'Unknown' && (
                                <div className="flex items-center gap-2 px-1">
                                    <span className="opacity-30 uppercase tracking-[0.15em] font-black text-[9px]">By</span>
                                    <span className="text-[13px] font-bold text-amber-400/70">{song.composer}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            try {
                                const newFav = !song.isFavorite;
                                const res = await fetch(apiUrl(`/api/songs/${song.id}/metadata`), {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ raga: song.raga, tala: song.tala, isFavorite: newFav })
                                });
                                const data = await res.json();
                                if (data.ok) {
                                    setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, isFavorite: newFav } : s));
                                }
                            } catch (err) {
                                console.error('Failed toggling favorite:', err);
                            }
                        }}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                            song.isFavorite
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                : 'bg-white/5 border-white/10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30'
                        }`}
                        title={song.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                        <Heart className={`w-4 h-4 transition-all ${song.isFavorite ? 'fill-rose-500' : 'fill-transparent'}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditSong(song.id); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                        title="Edit Song"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-all">
                        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                </div>
            </div>
        </div>

    );
}
