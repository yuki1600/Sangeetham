import React, { useState, useEffect } from 'react';
import { ChevronRight, Music2, Globe, Disc3, Pencil } from 'lucide-react';

/**
 * SongsPanel — shows published community songs dynamically from the backend.
 */
export default function SongsPanel({ onSelectSong, onEditSong }) {
    const [publishedSongs, setPublishedSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/songs')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPublishedSongs(data.filter(s => s.isPublished));
                }
            })
            .catch(e => console.error('Failed fetching published songs:', e))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) return null;
    if (publishedSongs.length === 0) return null;

    return (
        <div className="fade-in mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Songs
                </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {publishedSongs.map(song => (
                    <button
                        key={song.id}
                        onClick={() => onSelectSong({ 
                            ...song, 
                            songViewId: song.id, 
                            jsonUrl: `/api/songs/${song.id}`,
                            audioUrl: `/api/songs/${song.id}/audio`,
                            isDynamic: true 
                        })}
                        className="w-full group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] p-4 text-left transition-all duration-400 hover:border-emerald-500/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

                        <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors duration-300">
                                    <Disc3 className="w-5 h-5 text-emerald-500 group-hover:text-white transition-colors" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-[var(--text-primary)] truncate">
                                            {song.title}
                                        </h4>
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <span className="opacity-40 uppercase tracking-wider font-black text-[9px]">Raga</span>
                                            <span className="font-semibold text-[var(--text-secondary)]">{song.raga || 'Ragamalika'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <span className="opacity-40 uppercase tracking-wider font-black text-[9px]">Tala</span>
                                            <span className="font-semibold text-[var(--text-secondary)]">{song.tala || 'Adi'}</span>
                                        </div>
                                        {song.composer && (
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                <span className="opacity-40 uppercase tracking-wider font-black text-[9px]">By</span>
                                                <span className="font-semibold text-[var(--text-secondary)]">{song.composer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditSong(song.id); }}
                                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                                    title="Edit Song"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
