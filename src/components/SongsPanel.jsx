import React from 'react';
import { ChevronRight, Music2 } from 'lucide-react';
import { GEETHAMS } from '../utils/carnaticData';

/**
 * SongsPanel — shows a direct link to featured songs.
 * This appears on the landing page above the Lessons section.
 */
export default function SongsPanel({ onSelectSong }) {
    const lambodhara = GEETHAMS.find(s => s.songViewId === 'lambodhara');

    if (!lambodhara) return null;

    return (
        <div className="fade-in mb-8">
            {/* Section label */}
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">
                Songs
            </h3>

            {/* Featured Song Card */}
            <button
                onClick={() => onSelectSong(lambodhara)}
                className="w-full group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] p-5 text-left transition-all duration-400 hover:border-emerald-500/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
                {/* Background accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Music2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold text-[var(--text-primary)] truncate">
                                    {lambodhara.title}
                                </h4>
                                <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex-shrink-0">
                                    Interactive
                                </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 uppercase tracking-widest font-black opacity-60">
                                {lambodhara.raga} · {lambodhara.tala}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
            </button>
        </div>
    );
}
