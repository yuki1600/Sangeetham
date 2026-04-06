import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Music2, Globe, Disc3, Pencil, Search, SlidersHorizontal, FileText, Heart, Plus } from 'lucide-react';

/**
 * SongsPanel — shows published community songs dynamically from the backend.
 * Includes search and "View More" pagination.
 */
export default function SongsPanel({ onSelectSong, onEditSong }) {
    const [allSongs, setAllSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(7);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/songs')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Show only favorite songs on the landing page Library
                    const favorites = data.filter(s => s.isFavorite);
                    favorites.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                    setAllSongs(favorites);
                }
            })
            .catch(e => console.error('Failed fetching published songs:', e))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredSongs = useMemo(() => {
        if (!searchQuery.trim()) return allSongs;
        const q = searchQuery.toLowerCase();
        return allSongs.filter(s => 
            (s.title || '').toLowerCase().includes(q) ||
            (s.raga || '').toLowerCase().includes(q) ||
            (s.tala || '').toLowerCase().includes(q) ||
            (s.composer || '').toLowerCase().includes(q)
        );
    }, [allSongs, searchQuery]);

    const visibleSongs = filteredSongs.slice(0, displayLimit);
    const hasMore = displayLimit < filteredSongs.length;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-medium">Loading catalog...</p>
        </div>
    );

    return (
        <div className="fade-in mb-8 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            Favorites ({filteredSongs.length})
                        </h3>
                    </div>
                    {hasMore && (
                        <button 
                            onClick={() => setDisplayLimit(prev => prev + 7)}
                            className="px-4 py-1.5 rounded-full bg-emerald-500 border border-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            View All Songs
                        </button>
                    )}
                </div>

                {/* Search bar removed for Favorites panel simplicity */}
            </div>

            <div className="grid gap-3">
                {visibleSongs.length > 0 ? (
                    visibleSongs.map(song => (
                        <button
                            key={song.id}
                            onClick={() => onSelectSong({ 
                                ...song, 
                                songViewId: song.id, 
                                jsonUrl: `/api/songs/${song.id}`,
                                audioUrl: `/api/songs/${song.id}/audio`,
                                isDynamic: true 
                            })}
                            className="w-full group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] p-4 text-left transition-all duration-400 hover:border-emerald-500/30 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

                            <div className="relative z-10 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        <Disc3 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-emerald-400 transition-colors">
                                            {song.title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="opacity-40 uppercase tracking-wider font-black text-[10px]">Raga</span>
                                                <span className="text-[13px] font-bold text-[var(--text-secondary)]">{song.raga || 'Other'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="opacity-40 uppercase tracking-wider font-black text-[10px]">Tala</span>
                                                <span className="text-[13px] font-bold text-[var(--text-secondary)]">{song.tala || 'Other'}</span>
                                            </div>
                                            {song.composer && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                                    <span className="opacity-40 uppercase tracking-wider font-black text-[10px]">By</span>
                                                    <span className="text-[13px] font-bold text-[var(--text-secondary)]">{song.composer}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const res = await fetch(`/api/songs/${song.id}/metadata`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ raga: song.raga, tala: song.tala, isFavorite: false })
                                                });
                                                const data = await res.json();
                                                if (data.ok) {
                                                    setAllSongs(prev => prev.filter(s => s.id !== song.id));
                                                }
                                            } catch (err) {
                                                console.error('Failed to unfavorite:', err);
                                            }
                                        }}
                                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
                                        title="Remove from Favorites"
                                    >
                                        <Heart className="w-4 h-4 fill-rose-500" />
                                    </button>
                                    {song.pdfPath && (
                                        <a 
                                            href={`/api/${song.pdfPath}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all"
                                            title="View PDF Notation"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <FileText className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditSong(song.id); }}
                                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-sm"
                                        title="Edit Song"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--glass-border)] bg-white/5">
                        <Music2 className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-20" />
                        <p className="text-[var(--text-muted)] text-sm">No songs match your search</p>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button 
                        onClick={() => setDisplayLimit(prev => prev + 7)}
                        className="px-6 py-2.5 rounded-2xl bg-emerald-500 border border-emerald-600 text-white text-xs font-bold hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        View All Songs
                    </button>
                </div>
            )}
        </div>
    );
}
