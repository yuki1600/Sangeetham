import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Palette, ChevronRight } from 'lucide-react';
import { LESSON_GROUPS } from '../utils/carnaticData';
import { EXERCISES } from '../utils/exercises';

/**
 * LessonsPanel — replaces ExerciseSelector on the home screen.
 * Shows a "Free Sandbox" card + grouped lesson type cards.
 */
export default function LessonsPanel({ onStartExercise, onBrowse }) {
    const sandboxExercise = EXERCISES.find(e => e.id === 'sustain-sa');

    return (
        <div className="fade-in">
            {/* Section label */}
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">
                Lessons
            </h3>

            {/* Free Sandbox — standalone featured card */}
            <button
                onClick={() => onStartExercise(sandboxExercise)}
                className="w-full mb-4 group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card-hover)] p-5 text-left transition-all duration-400 hover:border-emerald-500/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
                {/* Background accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h4 className="text-xl font-bold text-[var(--text-primary)] transition-colors">
                                Free Sandbox
                            </h4>
                            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 flex-shrink-0">
                                Open Ended
                            </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md">
                            Sing freely and explore your voice. No fixed sequence — just you and the pitch monitor.
                        </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
            </button>

            {/* Lesson Groups grid */}
            <div className="grid grid-cols-2 gap-3">
                {LESSON_GROUPS.map((group) => {
                    return (
                        <button
                            key={group.id}
                            onClick={() => onBrowse(group.id)}
                            className="group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                        >
                            {/* Hover glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${group.color} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-300 pointer-events-none rounded-2xl`} />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[9px] font-bold tracking-tighter uppercase px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm`}>
                                        {group.level}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <h4 className="font-bold text-[var(--text-primary)] transition-colors text-base leading-tight">
                                    {group.label}
                                </h4>
                                <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                                    {group.description}
                                </p>
                                <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                                    <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                                        {group.songs.length} {group.songs.length === 1 ? 'piece' : 'pieces'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
