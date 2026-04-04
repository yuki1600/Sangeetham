import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { startMic, stopMic, getAudioBuffer } from '../utils/audioEngine';
import { initPitchDetector, detectPitch } from '../utils/pitchDetection';
import { hzToSwara, TONIC_PRESETS } from '../utils/swaraUtils';
import { startDrone, stopDrone, isDronePlaying, setDroneVolume, getDroneVolume } from '../utils/droneEngine';

export default function CompactPitchBar({ tonicHz, onTonicChange, theme }) {
    const [currentSwara, setCurrentSwara] = useState(null);
    const [droneActive, setDroneActive] = useState(isDronePlaying());
    const [droneVolume, setDroneVolumeState] = useState(getDroneVolume());
    const [micReady, setMicReady] = useState(false);

    const lastProcessTimeRef = useRef(0);
    const rafRef = useRef(null);

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

    useEffect(() => {
        let cancelled = false;
        const setup = async () => {
            try {
                const { sampleRate } = await startMic();
                initPitchDetector(sampleRate);
                if (!cancelled) setMicReady(true);
            } catch (err) {
                console.error('Mic setup failed:', err);
            }
        };
        setup();
        return () => {
            cancelled = true;
            stopMic();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    useEffect(() => {
        if (!micReady) return;

        let smoothHz = null;
        const hzHistory = [];

        const loop = () => {
            const buffer = getAudioBuffer();
            if (buffer) {
                const rawHz = detectPitch(buffer);
                const now = performance.now();

                if (now - lastProcessTimeRef.current >= 100) {
                    lastProcessTimeRef.current = now;

                    if (rawHz) {
                        hzHistory.push(rawHz);
                        if (hzHistory.length > 3) hzHistory.shift();
                        const sorted = [...hzHistory].sort((a, b) => a - b);
                        const median = sorted[Math.floor(sorted.length / 2)];

                        if (smoothHz === null || Math.abs(smoothHz - median) > 30) {
                            smoothHz = median;
                        } else {
                            smoothHz = smoothHz * 0.8 + median * 0.2;
                        }
                    } else {
                        hzHistory.push(null);
                        if (hzHistory.length > 3) hzHistory.shift();
                        if (hzHistory.every(h => h === null)) smoothHz = null;
                    }

                    if (smoothHz) {
                        const swaraInfo = hzToSwara(smoothHz, tonicHz);
                        if (swaraInfo) {
                            setCurrentSwara({
                                ...swaraInfo,
                                hz: smoothHz,
                                deviation: Math.round(swaraInfo.deviation)
                            });
                        } else {
                            setCurrentSwara(null);
                        }
                    } else {
                        setCurrentSwara(null);
                    }
                }
            }
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [micReady, tonicHz]);

    const isDark = theme !== 'light';

    return (
        <div className="flex items-center justify-center gap-6 py-2 w-full">
            {/* Pitch Display */}
            <div className={`flex items-center gap-4 px-6 rounded-full border transition-all duration-300 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                }`} style={{ height: '56px', minWidth: '220px' }}>
                {currentSwara ? (
                    <>
                        <div className="flex items-center justify-center w-16">
                            <div className={`text-4xl font-black transition-all duration-300 ${Math.abs(currentSwara.deviation) <= 15 ? 'text-emerald-400' :
                                Math.abs(currentSwara.deviation) <= 35 ? 'text-yellow-400' :
                                    isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                {currentSwara.swara}
                            </div>
                        </div>
                        <div className={`w-px h-10 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        <div className="flex flex-col leading-tight">
                            <div className={`text-xl font-bold tabular-nums whitespace-nowrap flex items-baseline gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {currentSwara.hz.toFixed(1)}
                                <span className="text-xs opacity-60 font-black tracking-widest">Hz</span>
                            </div>
                            <div className={`text-xs font-black tracking-[0.2em] uppercase ${Math.abs(currentSwara.deviation) <= 15 ? 'text-emerald-400' :
                                Math.abs(currentSwara.deviation) <= 35 ? 'text-yellow-400' :
                                    'opacity-60'
                                }`}>
                                {currentSwara.deviation > 0 ? '+' : ''}{currentSwara.deviation}¢
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3 opacity-40 px-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        <span className="text-xs font-black tracking-[0.2em] uppercase">Listening</span>
                    </div>
                )}
            </div>

            {/* Scale Selector */}
            <div className={`flex items-center p-1 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                }`} style={{ height: '56px' }}>
                {TONIC_PRESETS.map((t) => {
                    const isSelected = t.hz === tonicHz;
                    return (
                        <button
                            key={t.name}
                            onClick={() => onTonicChange(t.hz)}
                            className={`
                                w-9 h-9 rounded-full text-xs font-black transition-all duration-200
                                ${isSelected
                                    ? 'bg-emerald-500 text-white shadow-xl scale-110 z-10'
                                    : `hover:bg-white/10 ${isDark ? 'text-white/60' : 'text-black/60'}`
                                }
                            `}
                        >
                            {t.name}
                        </button>
                    );
                })}
            </div>

            {/* Drone Controls */}
            <div className="relative" style={{ height: '56px', width: '56px' }}>
                <div 
                    className={`absolute left-0 top-0 flex items-center px-2 rounded-full border transition-all duration-500 ease-in-out overflow-hidden shadow-xl ${
                        isDark ? 'bg-[#141420]/90 border-white/10' : 'bg-white/90 border-black/10'
                    }`} 
                    style={{ 
                        height: '56px', 
                        width: droneActive ? '210px' : '56px',
                        backdropFilter: 'blur(10px)',
                        zIndex: 40
                    }}
                >
                    <button
                        onClick={toggleDrone}
                        className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 ${droneActive
                            ? 'text-emerald-400'
                            : `hover:text-white ${isDark ? 'text-white/40' : 'text-black/40'}`
                            }`}
                        title={droneActive ? "Turn Drone Off" : "Turn Drone On"}
                    >
                        {droneActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center transition-all duration-500 ease-in-out h-full overflow-hidden"
                        style={{ 
                            width: droneActive ? '150px' : '0px', 
                            opacity: droneActive ? 1 : 0,
                            marginLeft: droneActive ? '4px' : '0px'
                        }}>
                        <div className={`w-px h-6 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        <div className="flex flex-col gap-1 ml-4 flex-1">
                            <div className="text-[9px] uppercase font-black tracking-widest opacity-40 leading-none">Drone</div>
                            <input
                                type="range"
                                min="-40"
                                max="0"
                                step="1"
                                value={droneVolume}
                                onChange={handleVolumeChange}
                                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                                style={{
                                    WebkitAppearance: 'none',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
