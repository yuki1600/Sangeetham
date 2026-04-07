import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Activity, Mic, MicOff } from 'lucide-react';
import { TONIC_PRESETS } from '../utils/swaraUtils';
import { startDrone, stopDrone, isDronePlaying, setDroneVolume, getDroneVolume } from '../utils/droneEngine';
import { resumeAudioContext } from '../utils/audioEngine';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { usePitchDetectionEnabled } from '../hooks/usePitchDetectionEnabled';

/**
 * TonicBar — Unified control bar for Tonic selection, Drone playback, and Live Pitch Monitoring.
 * Refined with a stable layout and centered live pitch detection.
 */
export default function TonicBar({ tonicHz, onTonicChange, theme }) {
    const [isDroneActive, setIsDroneActive] = useState(isDronePlaying());
    const [volume, setVolume] = useState(getDroneVolume());
    const [pitchEnabled, setPitchEnabled] = usePitchDetectionEnabled();

    // Pitch Monitoring (auto-starts on interaction inside the hook)
    const { pitchData, signalLevel, isMicActive } = usePitchDetection(tonicHz, {
        enabled: pitchEnabled,
        throttleMs: 80,
        signalLevel: true,
        watchdog: true,
    });

    // --- Drone Logic ---
    useEffect(() => {
        const timer = setInterval(() => {
            const playing = isDronePlaying();
            if (playing !== isDroneActive) setIsDroneActive(playing);
        }, 500);
        return () => clearInterval(timer);
    }, [isDroneActive]);

    useEffect(() => {
        if (isDroneActive) {
            startDrone(tonicHz);
        }
    }, [tonicHz, isDroneActive]);

    const toggleDrone = useCallback(async () => {
        if (isDroneActive) {
            stopDrone();
            setIsDroneActive(false);
        } else {
            await startDrone(tonicHz);
            setIsDroneActive(true);
        }
    }, [isDroneActive, tonicHz]);

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setDroneVolume(val);
    };

    // Resume the AudioContext on user interaction (browser autoplay policy)
    useEffect(() => {
        const tryResume = () => resumeAudioContext();
        const events = ['click', 'mousedown', 'pointerdown', 'touchstart', 'keydown', 'scroll'];
        events.forEach(e => window.addEventListener(e, tryResume, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, tryResume));
    }, []);

    return (
        <div className="w-full mb-8 sticky top-0 z-30 fade-in">
            <div 
                className="relative overflow-hidden rounded-3xl border border-[var(--glass-border)] transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                style={{ 
                    background: 'var(--glass-bg)', 
                    backdropFilter: 'blur(24px)', 
                    WebkitBackdropFilter: 'blur(24px)' 
                }}
            >
                {/* Visualizer Background Accent */}
                <div 
                    className="absolute inset-0 transition-opacity duration-700 pointer-events-none" 
                    style={{ 
                        background: pitchData ? `radial-gradient(circle at center, ${pitchData.color}15 0%, transparent 70%)` : 'none',
                        opacity: pitchData ? 1 : 0
                    }}
                />
                
                <div className="relative z-10 px-6 py-4 flex flex-col lg:flex-row items-center gap-6 lg:gap-0 h-auto lg:h-[84px]">
                    
                    {/* Left: Drone Controls */}
                    <div className="flex items-center gap-4 lg:border-r border-[var(--glass-border)] lg:pr-8 flex-shrink-0 min-w-[160px]">
                        <button
                            onClick={toggleDrone}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                isDroneActive 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                                : 'bg-white/5 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                        >
                            {isDroneActive ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 leading-none mb-1">Shruti</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-bold text-[var(--text-primary)]">
                                    {TONIC_PRESETS.find(p => p.hz === tonicHz)?.name || 'Custom'}
                                </span>
                                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                                    {Math.round(tonicHz)}Hz
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Live Pitch Monitor (Stable Width, No Internal Borders) */}
                    <div className="flex-1 flex items-center justify-center pl-4 lg:pl-8 pr-4 lg:pr-8 gap-4">
                        <button
                            onClick={() => setPitchEnabled(!pitchEnabled)}
                            title={pitchEnabled ? 'Turn off live pitch detection' : 'Turn on live pitch detection'}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                                pitchEnabled
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'bg-white/5 text-[var(--text-muted)] border border-white/10 hover:text-white/80 hover:bg-white/10'
                            }`}
                        >
                            {pitchEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>
                        <div className="min-w-[260px] flex items-center justify-center transition-all duration-300">
                            {!pitchEnabled ? (
                                <div className="flex items-center gap-3 opacity-30">
                                    <MicOff className="w-4 h-4 text-[var(--text-muted)]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                        Pitch Detection Off
                                    </span>
                                </div>
                            ) : pitchData ? (
                                <div className="flex items-center gap-8 slide-up">
                                    <div
                                        className="text-4xl font-black transition-colors duration-200"
                                        style={{ color: pitchData.color, textShadow: `0 0 15px ${pitchData.color}40` }}
                                    >
                                        {pitchData.swara}
                                    </div>
                                    <div className="w-[1px] h-8 bg-[var(--glass-border)]/50" />
                                    <div className="flex flex-row items-center gap-3">
                                        <div className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                                            {pitchData.hz} <span className="text-[10px] font-normal text-[var(--text-muted)] uppercase">Hz</span>
                                        </div>
                                        <div
                                            className="text-[11px] font-black tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/5"
                                            style={{ color: pitchData.color }}
                                        >
                                            {pitchData.deviation > 0 ? '+' : ''}{pitchData.deviation}¢
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 opacity-30">
                                    <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                        {isMicActive ? (signalLevel > 0.05 ? 'Detecting...' : 'Listening') : 'Monitor Off'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Note Select & Volume */}
                    <div className="flex items-center gap-6 lg:border-l border-[var(--glass-border)] lg:pl-8 flex-shrink-0">
                        {/* Compact Volume */}
                        <div className="flex items-center gap-3 mr-2">
                            <div className="p-2 rounded-lg bg-white/5 text-[var(--text-muted)]">
                                {volume <= -40 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </div>
                            <input 
                                type="range"
                                min="-40"
                                max="10"
                                step="1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 md:w-28 accent-emerald-500 h-1 rounded-full bg-emerald-500/20 cursor-pointer appearance-none border border-white/5 hover:bg-emerald-500/30 transition-all"
                            />
                        </div>

                        {/* Tonic Selector */}
                        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[180px] md:max-w-none">
                            {TONIC_PRESETS.map((preset) => {
                                const isSelected = preset.hz === tonicHz;
                                return (
                                    <button
                                        key={preset.name}
                                        onClick={() => onTonicChange(preset.hz)}
                                        className={`
                                            flex-shrink-0 min-w-[34px] h-8 rounded-lg text-[10px] font-black transition-all duration-300 border text-black
                                            ${isSelected
                                                ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/20'
                                                : 'bg-white/5 border-transparent hover:text-black hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {preset.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
