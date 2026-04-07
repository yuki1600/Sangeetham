import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, PlayCircle, GraduationCap } from 'lucide-react';
import { EXERCISES } from '../utils/exercises';

// Display order for category cards — beginner-friendly forms first, then the
// concert forms, then the lighter / devotional categories. Categories not
// listed here are appended at the end alphabetically.
const TYPE_ORDER = [
    'Geetham', 'Swarajathi', 'Varnam', 'Kriti', 'Tillana', 'Javali',
    'Padam', 'Devaranama', 'Sankeertana', 'Bhajan', 'Slokam', 'Viruttam',
];

// Per-category accent colors and short descriptive blurbs.
const TYPE_META = {
    Geetham:     { color: '#10b981', level: 'Beginner',     blurb: 'Simple devotional starters' },
    Swarajathi:  { color: '#06b6d4', level: 'Beginner+',    blurb: 'Swara-driven introductions' },
    Varnam:      { color: '#8b5cf6', level: 'Foundation',   blurb: 'Raga blueprint exercises' },
    Kriti:       { color: '#f59e0b', level: 'Concert',      blurb: 'Trinity & post-trinity gems' },
    Tillana:     { color: '#ec4899', level: 'Concluding',   blurb: 'Rhythmic concluding pieces' },
    Javali:      { color: '#f43f5e', level: 'Light',        blurb: 'Romantic light classical' },
    Padam:       { color: '#a855f7', level: 'Expressive',   blurb: 'Slow expressive bhakti pieces' },
    Devaranama:  { color: '#3b82f6', level: 'Devotional',   blurb: 'Haridasa devotional songs' },
    Sankeertana: { color: '#14b8a6', level: 'Devotional',   blurb: 'Annamacharya keertanas' },
    Bhajan:      { color: '#f97316', level: 'Devotional',   blurb: 'Saint-poet bhajans' },
    Slokam:      { color: '#eab308', level: 'Recitative',   blurb: 'Free-meter verses' },
    Viruttam:    { color: '#6366f1', level: 'Recitative',   blurb: 'Tamil free-meter verses' },
    Other:       { color: '#64748b', level: 'Misc',         blurb: 'Uncategorised pieces' },
};

/**
 * LessonsPanel — sidebar navigation for the home page.
 *
 * The panel fetches every published song from the backend, groups them by
 * `compositionType`, and presents one card per category. Selecting a card
 * navigates to the SongBrowser with a synthetic group id of the form
 * `type:Geetham`, which SongBrowser knows how to expand into a live song
 * list. The Free Practice (sandbox exercise) tile is preserved on top.
 */
export default function LessonsPanel({ onStartExercise, onBrowse }) {
    const sandboxExercise = EXERCISES.find(e => e.id === 'sustain-sa');
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/songs')
            .then(r => r.json())
            .then(data => {
                if (cancelled || !Array.isArray(data)) return;
                const next = {};
                for (const s of data) {
                    if (!s.isPublished) continue;
                    const t = s.compositionType || 'Other';
                    next[t] = (next[t] || 0) + 1;
                }
                setCounts(next);
            })
            .catch(e => console.error('Failed to load song counts:', e))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Build the ordered list of categories: known order first, then any
    // unexpected types (like "Other") alphabetically at the bottom.
    const categories = useMemo(() => {
        const known = TYPE_ORDER.filter(t => counts[t] > 0);
        const extras = Object.keys(counts)
            .filter(t => !TYPE_ORDER.includes(t))
            .sort();
        return [...known, ...extras];
    }, [counts]);

    return (
        <div className="fade-in">
            <div className="flex items-center gap-2 mb-4 px-1">
                <GraduationCap className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]">
                    Learning Path
                </h3>
            </div>

            <div className="flex flex-col gap-3">
                {/* Free Sandbox — standalone at the top of the list */}
                {sandboxExercise && (
                    <button
                        onClick={() => onStartExercise(sandboxExercise)}
                        className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left transition-all duration-300 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <PlayCircle className="w-5 h-5 text-emerald-500 group-hover:text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)] text-sm leading-tight">
                                    Free Practice
                                </h4>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-wider">
                                    Sandbox Mode
                                </p>
                            </div>
                        </div>
                    </button>
                )}

                {/* Category Cards (one per compositionType) */}
                {loading ? (
                    <div className="flex items-center justify-center py-10 opacity-40">
                        <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                ) : categories.length === 0 ? (
                    <p className="text-xs italic opacity-50 px-2 py-4">No songs in the library yet.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {categories.map((cat) => {
                            const meta = TYPE_META[cat] || TYPE_META.Other;
                            const accent = meta.color;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => onBrowse(`type:${cat}`)}
                                    className="group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-card)] p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
                                    style={{
                                        background: 'var(--glass-bg)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        borderColor: `${accent}26`,
                                    }}
                                >
                                    <div
                                        className="absolute inset-y-0 left-0 w-[3px]"
                                        style={{ background: accent }}
                                    />
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                        style={{ background: `linear-gradient(90deg, ${accent}14, transparent 60%)` }}
                                    />

                                    <div className="relative z-10 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: `${accent}1f`,
                                                    border: `1px solid ${accent}40`,
                                                }}
                                            >
                                                <span
                                                    className="text-[14px] font-black"
                                                    style={{ color: accent }}
                                                >
                                                    {cat.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md border"
                                                        style={{
                                                            color: accent,
                                                            background: `${accent}14`,
                                                            borderColor: `${accent}33`,
                                                        }}
                                                    >
                                                        {meta.level}
                                                    </span>
                                                </div>
                                                <h4
                                                    className="font-bold text-[var(--text-primary)] text-sm leading-tight transition-colors truncate"
                                                    style={{ '--accent': accent }}
                                                >
                                                    {cat}
                                                </h4>
                                                <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide truncate">
                                                    {counts[cat]} {counts[cat] === 1 ? 'piece' : 'pieces'} · {meta.blurb}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-all flex-shrink-0"
                                            style={{ color: accent }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
