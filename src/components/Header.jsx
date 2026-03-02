import React from 'react';
import { Music, Sun, Moon } from 'lucide-react';

export default function Header({ theme, onToggleTheme }) {
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
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleTheme}
                    className="btn-icon text-sm"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </header>
    );
}
