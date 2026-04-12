import React from 'react';
import { Music, Sun, Moon, FilePen, Info } from 'lucide-react';

export default function Header({ theme, onToggleTheme, onEditor, onInfo }) {
    return (
        <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        Sangeetham
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] -mt-0.5">Carnatic Music Trainer</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {onEditor && (
                    <button
                        onClick={onEditor}
                        className="flex items-center gap-2 px-4 h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                        title="Song Editor"
                    >
                        <FilePen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden sm:inline">Editor</span>
                    </button>
                )}
                
                <button
                    onClick={onToggleTheme}
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-amber-400" />
                    ) : (
                        <Moon className="w-5 h-5 text-indigo-400" />
                    )}
                </button>

                <button
                    onClick={onInfo}
                    className="flex items-center gap-2 px-4 h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                    title="About Sangeetham"
                >
                    <Info className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden sm:inline">Info</span>
                </button>
            </div>
        </header>
    );
}
