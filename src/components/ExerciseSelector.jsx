import React from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { EXERCISES } from '../utils/exercises';
import { getBestAccuracy } from '../utils/storage';

export default function ExerciseSelector({ onSelect }) {
    return (
        <div className="fade-in">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">
                Practice Exercises
            </h3>
            <div className="grid gap-3">
                {EXERCISES.map((ex) => {
                    const best = getBestAccuracy(ex.id);
                    const IconComponent = LucideIcons[ex.icon] || LucideIcons.Music;

                    return (
                        <button
                            key={ex.id}
                            onClick={() => onSelect(ex)}
                            className="glass-card p-5 text-left w-full group overflow-hidden relative"
                        >
                            {/* Subtle background glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center text-emerald-400 border border-[var(--glass-border)] group-hover:border-emerald-500/30 transition-all">
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                                            {ex.name}
                                        </h4>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: 3 }, (_, i) => (
                                                <span
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < ex.difficulty
                                                        ? 'bg-emerald-500'
                                                        : 'bg-[var(--text-muted)] opacity-30'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">
                                        {ex.description}
                                    </p>
                                    {best !== null && (
                                        <span className="inline-block mt-2 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            Best Score: {Math.round(best)}%
                                        </span>
                                    )}
                                </div>
                                <div className="self-center text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
