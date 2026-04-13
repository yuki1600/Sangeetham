import { Music, Sun, Moon, FilePen, Info, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ theme, onToggleTheme, onEditor, onApprovals, onProfile, onInfo }) {
    const { user, loginWithGoogle, isAdmin, isEditor } = useAuth();
    return (
        <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Music className="w-6 h-6 text-white" />
                </div>
                <div className="cursor-pointer" onClick={() => window.location.href = '/'}>
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        Sangeetham
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] -mt-0.5">Carnatic Music Trainer</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isEditor && onEditor && (
                    <button
                        onClick={onEditor}
                        className="flex items-center gap-2 px-4 h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                        title="Song Editor"
                    >
                        <FilePen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden sm:inline">Editor</span>
                    </button>
                )}

                {isAdmin && onApprovals && (
                    <button
                        onClick={onApprovals}
                        className="flex items-center gap-2 px-4 h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group"
                        title="Approvals"
                    >
                        <CheckCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden sm:inline">Approvals</span>
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

                {user ? (
                    <button 
                        onClick={onProfile}
                        className="flex items-center gap-3 pl-2 h-11 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--bg-card-hover)] transition-all group ml-2"
                    >
                        <div className="flex flex-col items-end pr-1 hidden md:flex">
                            <span className="text-[10px] font-bold text-[var(--text-primary)] leading-tight">{user.name}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 opacity-80">{user.role}</span>
                        </div>
                        <img 
                            src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff`} 
                            alt={user.name} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg border border-emerald-500/30 group-hover:border-emerald-500 transition-colors"
                        />
                    </button>
                ) : (
                    <button
                        onClick={loginWithGoogle}
                        className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white text-black hover:bg-white/90 transition-all shadow-lg border border-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <LogIn className="w-4 h-4 text-black" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Login</span>
                    </button>
                )}
            </div>
        </header>
    );
}
