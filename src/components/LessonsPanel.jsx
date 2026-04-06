import React from 'react';
import { ChevronRight, PlayCircle, GraduationCap } from 'lucide-react';
import { LESSON_GROUPS } from '../utils/carnaticData';
import { EXERCISES } from '../utils/exercises';

/**
 * LessonsPanel — sidebar navigation for lesson groups.
 * Optimized for a vertical layout.
 */
export default function LessonsPanel({ onStartExercise, onBrowse }) {
    const sandboxExercise = EXERCISES.find(e => e.id === 'sustain-sa');

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

                {/* Lesson Groups in a vertical stack */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                    {LESSON_GROUPS.map((group) => {
                        return (
                            <button
                                key={group.id}
                                onClick={() => onBrowse(group.id)}
                                className="group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-card)] p-4 text-left transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-black/20"
                                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                                                {group.level}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-[var(--text-primary)] text-sm leading-tight group-hover:text-emerald-400 transition-colors">
                                            {group.label}
                                        </h4>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-wider">
                                            {group.songs.length} Pieces
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
