import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Mic, MicOff, ChevronDown } from 'lucide-react';
import { TONIC_PRESETS } from '../../utils/swaraUtils';
import { startDrone, stopDrone, isDronePlaying, setDroneVolume, getDroneVolume } from '../../utils/droneEngine';
import { usePitchDetection } from '../../hooks/usePitchDetection';
import { usePitchDetectionEnabled } from '../../hooks/usePitchDetectionEnabled';

/**
 * Redesigned Drone/Mic control row.
 * Provides live pitch feedback, tonic selection, and drone mixing.
 * Spans the full width of the audio controls area.
 */
export default function PitchMixerRow({ tonicHz, onTonicChange, isDark, borderColor }) {
    const [droneActive, setDroneActive] = useState(isDronePlaying());
    const [droneVolume, setDroneVolumeState] = useState(getDroneVolume());
    const [pitchEnabled, setPitchEnabled] = usePitchDetectionEnabled();
    const [showVolume, setShowVolume] = useState(false);

    const { pitchData: currentSwara } = usePitchDetection(tonicHz, { enabled: pitchEnabled });

    const toggleDrone = useCallback(async () => {
        if (droneActive) {
            stopDrone();
            setDroneActive(false);
        } else {
            await startDrone(tonicHz);
            setDroneActive(true);
        }
    }, [droneActive, tonicHz]);

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setDroneVolumeState(val);
        setDroneVolume(val);
    };

    // Auto-update drone when tonic changes
    useEffect(() => {
        if (droneActive) {
            startDrone(tonicHz);
        }
    }, [tonicHz, droneActive]);

    const pitchColorClass = currentSwara ? (
        Math.abs(currentSwara.deviation) <= 15 ? 'text-emerald-400' :
        Math.abs(currentSwara.deviation) <= 35 ? 'text-yellow-400' :
        'text-rose-400'
    ) : 'text-white/40';

    return (
        <div className="flex items-center gap-4 px-5 py-1.5 rounded-2xl border shadow-sm transition-all"
             style={{ 
                 background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
                 borderColor 
             }}>
            
            {/* 1. Main Display: Swara/Pitch + Scale */}
            <div className="flex items-center gap-10 flex-1 min-w-0">
                {/* Switchable display: Mic On vs Off */}
                <div className="flex items-center gap-4 min-w-0">
                    {!pitchEnabled ? (
                        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-20">Mic Disabled</span>
                    ) : currentSwara ? (
                        <div className="flex items-center gap-6">
                            <div className={`text-4xl font-black min-w-[2.5rem] text-center tracking-tighter ${pitchColorClass}`}>
                                {currentSwara.swara}
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-base font-black tabular-nums leading-none">
                                    {Math.round(currentSwara.hz)}<span className="text-xs opacity-50 ml-1 font-bold">Hz</span>
                                </span>
                                <span className={`text-[11px] font-black tracking-[0.15em] uppercase mt-1.5 ${pitchColorClass}`}>
                                    {currentSwara.deviation > 0 ? '+' : ''}{currentSwara.deviation}¢
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/40 animate-pulse">Listening...</span>
                        </div>
                    )}
                </div>

                {/* Scale / Tonic (Now part of the main display group) */}
                <div className="flex items-center px-4 py-1.5 rounded-xl border bg-white/5 transition-all hover:bg-white/10"
                     style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                    <div className="relative flex items-center">
                        <select
                            value={tonicHz}
                            onChange={(e) => onTonicChange(parseFloat(e.target.value))}
                            className="bg-transparent text-sm font-black uppercase tracking-widest appearance-none focus:outline-none cursor-pointer pr-6"
                            style={{ color: isDark ? '#fff' : '#000' }}
                        >
                            {TONIC_PRESETS.map((t) => (
                                <option key={t.name} value={t.hz} style={{ background: isDark ? '#141420' : '#fff' }}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-0 pointer-events-none opacity-40" />
                    </div>
                </div>
            </div>

            {/* 2. Vertically Stacked Action Icons (Right Side) */}
            <div className="flex flex-col gap-1.5 pl-3 border-l" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                {/* Mic Toggle */}
                <button
                    onClick={() => setPitchEnabled(!pitchEnabled)}
                    title="Toggle Pitch Detection"
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border ${
                        pitchEnabled 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'border-transparent opacity-20 hover:opacity-100'
                    }`}
                >
                    {pitchEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>

                {/* Drone Toggle & Volume Popover */}
                <div 
                    className="relative group" 
                    onMouseEnter={() => setShowVolume(true)}
                    onMouseLeave={() => setShowVolume(false)}
                >
                    <button
                        onClick={toggleDrone}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border ${
                            droneActive 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                            : 'border-transparent opacity-30 hover:opacity-100'
                        }`}
                        title={droneActive ? "Stop Drone" : "Start Drone"}
                    >
                        {droneActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>

                    {/* Vertical Volume Slider Popover with Hover Bridge */}
                    {showVolume && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-full pr-3 z-50 animate-in fade-in slide-in-from-right-1 duration-200">
                            <div className="p-3 rounded-xl border shadow-2xl flex flex-col items-center gap-2"
                                 style={{ 
                                     background: isDark ? '#1a1a2e' : '#fff', 
                                     borderColor,
                                     width: '36px' 
                                 }}>
                                <div className="text-[7px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">Vol</div>
                                <input
                                    type="range"
                                    min="-40"
                                    max="0"
                                    step="1"
                                    value={droneVolume}
                                    onChange={handleVolumeChange}
                                    className="h-20 w-1.5 accent-emerald-500 rounded-lg cursor-pointer appearance-none"
                                    style={{ 
                                        WebkitAppearance: 'slider-vertical',
                                        appearance: 'slider-vertical' 
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
