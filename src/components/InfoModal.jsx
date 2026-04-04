import React from 'react';
import { X, Linkedin, Github, Cpu, Heart, Music, Sparkles, Code2, Globe } from 'lucide-react';

export default function InfoModal({ onClose, theme }) {
    const isDark = theme !== 'light';
    
    // Theme tokens
    const bg = isDark ? 'rgba(10, 10, 15, 0.95)' : 'rgba(255, 255, 255, 0.98)';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f0f0fa' : '#0f172a';
    const textSecondary = isDark ? 'rgba(240, 240, 250, 0.6)' : 'rgba(15, 23, 42, 0.6)';

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300"
                style={{ background: bg, borderColor: borderColor }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b relative overflow-hidden" style={{ borderColor }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg transform rotate-3">
                            <Music className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight" style={{ color: textPrimary }}>About Sangeetham</h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Carnatic Music Learning App</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-black/5 transition-all group"
                        style={{ color: textPrimary }}
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar space-y-10">
                    {/* Intro Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <h3 className="text-lg font-extrabold" style={{ color: textPrimary }}>The Vision</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                            Sangeetham is a modern, interactive platform designed to master the fundamentals of Carnatic music. 
                            Featuring real-time pitch tracking, interactive lessons, and a powerful notation editor, 
                            it empowers students and teachers to preserve and practice classical traditions with state-of-the-art technology.
                        </p>
                    </section>

                    {/* Creators */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Heart className="w-5 h-5 text-red-500" />
                            <h3 className="text-lg font-extrabold" style={{ color: textPrimary }}>Creators</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Srikanth */}
                            <div className="p-6 rounded-[2rem] border transition-all hover:scale-[1.02]" style={{ background: cardBg, borderColor }}>
                                <h4 className="font-black text-base" style={{ color: textPrimary }}>Srikanth Nadhamuni</h4>
                                <p className="text-xs font-medium mt-1 mb-4" style={{ color: textSecondary }}>Vision, Product Design & Development</p>
                                <a 
                                    href="https://www.linkedin.com/in/srikanthnadhamuni/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition-all"
                                >
                                    <Linkedin className="w-3.5 h-3.5" />
                                    Connect
                                </a>
                            </div>
                            {/* Yuktesh */}
                            <div className="p-6 rounded-[2rem] border transition-all hover:scale-[1.02]" style={{ background: cardBg, borderColor }}>
                                <h4 className="font-black text-base" style={{ color: textPrimary }}>Yuktesh Balaji</h4>
                                <p className="text-xs font-medium mt-1 mb-4" style={{ color: textSecondary }}>Lead Developer & Architect</p>
                                <a 
                                    href="https://www.linkedin.com/in/yuktesh-b-aa4a801a5/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition-all"
                                >
                                    <Linkedin className="w-3.5 h-3.5" />
                                    Connect
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Open Source */}
                    <section className="space-y-4 p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-3">
                            <Github className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-lg font-extrabold" style={{ color: textPrimary }}>Open Source</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                            Sangeetham is an open-source project dedicated to the global music community. 
                            We welcome contributions, feedback, and collaborations to build the future of music education together.
                        </p>
                    </section>

                    {/* Tech Stack */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Cpu className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-extrabold" style={{ color: textPrimary }}>Technology</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { name: 'React 19', icon: Code2 },
                                { name: 'Tailwind CSS 4', icon: Sparkles },
                                { name: 'Vite', icon: Cpu },
                                { name: 'Tone.js', icon: Music },
                                { name: 'Node.js', icon: Globe },
                            ].map((tech) => (
                                <div 
                                    key={tech.name}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider"
                                    style={{ borderColor, color: textSecondary, background: cardBg }}
                                >
                                    <tech.icon className="w-3 h-3" />
                                    {tech.name}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t flex items-center justify-center" style={{ borderColor }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 text-center">
                        Built with ❤️ for Carnatic Music
                    </p>
                </div>
            </div>
        </div>
    );
}
