import React, { useState, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Search, X, Music, ChevronRight, Filter, Pencil } from 'lucide-react';
import { LESSON_GROUPS } from '../utils/carnaticData';
import { apiUrl } from '../utils/api';

// Per-category accent classes (Tailwind gradient strings, to match the
// existing SongCard hover overlay) and labels for the dynamic
// compositionType groups (keyed off `type:<CompositionType>` group ids).
const TYPE_META = {
    Geetham:     { gradient: 'from-emerald-500 to-teal-600',  level: 'Beginner',   blurb: 'Simple devotional starters' },
    Swarajathi:  { gradient: 'from-cyan-500 to-sky-600',      level: 'Beginner+',  blurb: 'Swara-driven introductions' },
    Varnam:      { gradient: 'from-violet-500 to-purple-600', level: 'Foundation', blurb: 'Raga blueprint exercises' },
    Kriti:       { gradient: 'from-amber-500 to-orange-600',  level: 'Concert',    blurb: 'Trinity & post-trinity gems' },
    Tillana:     { gradient: 'from-pink-500 to-rose-600',     level: 'Concluding', blurb: 'Rhythmic concluding pieces' },
    Javali:      { gradient: 'from-rose-500 to-red-600',      level: 'Light',      blurb: 'Romantic light classical' },
    Padam:       { gradient: 'from-purple-500 to-fuchsia-600',level: 'Expressive', blurb: 'Slow expressive bhakti pieces' },
    Devaranama:  { gradient: 'from-blue-500 to-indigo-600',   level: 'Devotional', blurb: 'Haridasa devotional songs' },
    Sankeertana: { gradient: 'from-teal-500 to-emerald-600',  level: 'Devotional', blurb: 'Annamacharya keertanas' },
    Bhajan:      { gradient: 'from-orange-500 to-amber-600',  level: 'Devotional', blurb: 'Saint-poet bhajans' },
    Slokam:      { gradient: 'from-yellow-500 to-amber-600',  level: 'Recitative', blurb: 'Free-meter verses' },
    Viruttam:    { gradient: 'from-indigo-500 to-violet-600', level: 'Recitative', blurb: 'Tamil free-meter verses' },
    Other:       { gradient: 'from-slate-500 to-slate-600',   level: 'Misc',       blurb: 'Uncategorised pieces' },
};

/**
 * SongBrowser — song list for a given group.
 *
 * Two flavours of group are supported:
 *   1) Static lesson groups from carnaticData (e.g. "beginner-1") — songs are
 *      pulled directly out of LESSON_GROUPS.
 *   2) Dynamic compositionType groups, identified by an id prefixed with
 *      `type:` (e.g. `type:Geetham`). Songs are fetched live from /api/songs
 *      and filtered down to that compositionType.
 */
export default function SongBrowser({ groupId, onBack, onSelectSong, onEditSong }) {
    // Dynamic mode: groupId is "type:Geetham"
    const isTypeGroup = typeof groupId === 'string' && groupId.startsWith('type:');
    const compositionType = isTypeGroup ? groupId.slice('type:'.length) : null;
    const typeMeta = compositionType ? (TYPE_META[compositionType] || TYPE_META.Other) : null;

    const staticGroup = !isTypeGroup ? LESSON_GROUPS.find(g => g.id === groupId) : null;

    const [dynamicSongs, setDynamicSongs] = useState([]);
    const [loading, setLoading] = useState(isTypeGroup);

    useEffect(() => {
        if (!isTypeGroup) return;
        let cancelled = false;
        setLoading(true);
        fetch(apiUrl('/api/songs'))
            .then(r => r.json())
            .then(data => {
                if (cancelled || !Array.isArray(data)) return;
                const filtered = data
                    .filter(s => s.isPublished && (s.compositionType || 'Other') === compositionType)
                    // Shape DB rows so they look like the static LESSON_GROUPS songs
                    // SongCard expects (.title, .raga, .tala, .composer, .id).
                    .map(s => ({
                        ...s,
                        songViewId: s.id,
                        jsonUrl: apiUrl(`/api/songs/${s.id}`),
                        audioUrl: apiUrl(`/api/songs/${s.id}/audio`),
                        isDynamic: true,
                    }))
                    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                setDynamicSongs(filtered);
            })
            .catch(e => console.error('Failed to load type group songs:', e))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isTypeGroup, compositionType]);

    // Synthesize a "group" object that the rest of the JSX renders against.
    const group = isTypeGroup
        ? {
            id: groupId,
            label: compositionType,
            level: typeMeta.level,
            color: typeMeta.gradient,
            icon: 'Disc3',
            blurb: typeMeta.blurb,
        }
        : staticGroup;

    const songs = isTypeGroup ? dynamicSongs : (staticGroup?.songs ?? []);


    const [query, setQuery] = useState('');
    const [openFilter, setOpenFilter] = useState(null); // 'raga' | 'tala' | 'composer' | null
    const [selectedRagas, setSelectedRagas] = useState([]);
    const [selectedTalas, setSelectedTalas] = useState([]);
    const [selectedComposers, setSelectedComposers] = useState([]);

    // Unique filter values
    const ragas = useMemo(() => [...new Set(songs.map(s => s.raga).filter(Boolean))].sort(), [songs]);
    const talas = useMemo(() => [...new Set(songs.map(s => s.tala).filter(Boolean))].sort(), [songs]);
    const composers = useMemo(() => [...new Set(songs.map(s => s.composer).filter(Boolean))].sort(), [songs]);

    // Filtered songs
    const filtered = useMemo(() => {
        return songs.filter(s => {
            const q = query.toLowerCase();
            if (q && !s.title.toLowerCase().includes(q) && !s.raga?.toLowerCase().includes(q)) return false;
            if (selectedRagas.length > 0 && !selectedRagas.includes(s.raga)) return false;
            if (selectedTalas.length > 0 && !selectedTalas.includes(s.tala)) return false;
            if (selectedComposers.length > 0 && !selectedComposers.includes(s.composer)) return false;
            return true;
        });
    }, [songs, query, selectedRagas, selectedTalas, selectedComposers]);

    const totalActiveFilters = selectedRagas.length + selectedTalas.length + selectedComposers.length;

    const toggleValue = (list, setList, value) => {
        setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const clearAll = () => {
        setSelectedRagas([]);
        setSelectedTalas([]);
        setSelectedComposers([]);
        setQuery('');
    };

    const IconComponent = LucideIcons[group?.icon] || Music;

    return (
        <div className="fade-in pb-8">

            {/* Top Bar */}
            <div className="flex items-center gap-3 pt-1 pb-4">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all flex-shrink-0"
                    title="Back"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="font-bold text-[var(--text-primary)] leading-tight">{group?.label}</h2>
                        <span className="text-[8px] font-bold tracking-tighter uppercase px-1.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm flex-shrink-0">
                            {group?.level}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{filtered.length} of {songs.length} pieces</p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="space-y-2 mb-4">
                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by title or raga…"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter pills row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    {[
                        { key: 'raga', label: 'Raga', selected: selectedRagas, values: ragas, setter: setSelectedRagas },
                        { key: 'tala', label: 'Tala', selected: selectedTalas, values: talas, setter: setSelectedTalas },
                        { key: 'composer', label: 'Composer', selected: selectedComposers, values: composers, setter: setSelectedComposers },
                    ].map(f => (
                        <div key={f.key} className="relative">
                            <button
                                onClick={() => setOpenFilter(openFilter === f.key ? null : f.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${f.selected.length > 0
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                    : 'bg-[var(--bg-card)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                                    }`}
                            >
                                {f.label}
                                {f.selected.length > 0 && (
                                    <span className="bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                                        {f.selected.length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {openFilter === f.key && (
                                <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-h-52 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--bg-card)] shadow-2xl py-1">
                                    {f.values.length === 0 && (
                                        <p className="text-xs text-[var(--text-muted)] px-3 py-2">No options</p>
                                    )}
                                    {f.values.map(val => {
                                        const active = f.selected.includes(val);
                                        return (
                                            <button
                                                key={val}
                                                onClick={() => toggleValue(f.selected, f.setter, val)}
                                                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${active
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${active ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--text-muted)]'
                                                    }`}>
                                                    {active && <span className="text-white text-[8px] font-bold">✓</span>}
                                                </div>
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Clear all */}
                    {(totalActiveFilters > 0 || query) && (
                        <button
                            onClick={clearAll}
                            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-red)] border border-transparent hover:border-[var(--accent-red)]/30 transition-all"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Active filter pills */}
                {totalActiveFilters > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            ...selectedRagas.map(v => ({ label: v, remove: () => toggleValue(selectedRagas, setSelectedRagas, v) })),
                            ...selectedTalas.map(v => ({ label: v, remove: () => toggleValue(selectedTalas, setSelectedTalas, v) })),
                            ...selectedComposers.map(v => ({ label: v, remove: () => toggleValue(selectedComposers, setSelectedComposers, v) })),
                        ].map(({ label, remove }) => (
                            <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                                {label}
                                <button onClick={remove} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Backdrop to close dropdown */}
            {openFilter && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
            )}

            {/* Song List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <p className="text-xs uppercase tracking-widest opacity-60">Loading songs…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                        <Music className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No pieces match your filters</p>
                        <button onClick={clearAll} className="mt-2 text-xs text-emerald-400 hover:underline">Clear filters</button>
                    </div>
                ) : (
                    filtered.map(song => (
                        <SongCard key={song.id} song={song} group={group} onSelect={onSelectSong} onEditSong={onEditSong} />
                    ))
                )}
            </div>
        </div>
    );
}

function SongCard({ song, group, onSelect, onEditSong }) {
    const hasExercise = !!song.exerciseId;
    return (
        <button
            onClick={() => onSelect(song)}
            className="w-full group relative overflow-hidden rounded-xl border border-[var(--glass-border)] p-3.5 text-left transition-all duration-300 hover:border-emerald-500/25 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${group?.color ?? 'from-emerald-500 to-teal-600'} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300 pointer-events-none`} />

            <div className="relative z-10 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors truncate">
                        {song.title}
                    </h4>
                    <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {song.raga && (
                                <MetaTag label={song.raga} color="raga" />
                            )}
                            {song.tala && (
                                <MetaTag label={song.tala} color="tala" />
                            )}
                        </div>
                        {song.composer && song.composer !== 'Traditional' && song.composer !== 'Unknown' && (
                            <div className="flex items-center gap-1.5 px-0.5">
                                <span className="opacity-40 uppercase tracking-widest font-black text-[8px]">By</span>
                                <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wide">{song.composer}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hasExercise && (
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Practice
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditSong(song.id); }}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                        title="Edit Song"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </button>
    );
}

function MetaTag({ label, color }) {
    const colorMap = {
        raga: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        tala: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        composer: 'bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20',
    };
    return (
        <span className={`inline-block text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded border ${colorMap[color] ?? colorMap.raga}`}>
            {label}
        </span>
    );
}
