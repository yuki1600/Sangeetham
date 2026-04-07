import React, { useState, useEffect, useRef, useCallback } from 'react';
import { startMic, stopMic, getAudioBuffer, getSampleRate, hasSignal } from '../utils/audioEngine';
import { initPitchDetector, detectPitch } from '../utils/pitchDetection';
import { hzToSwara } from '../utils/swaraUtils';

/**
 * Live Pitch Monitor — real-time pitch display for tuning/practice.
 * Shows current detected pitch (Hz), nearest swara, and cents deviation.
 */
export default function LivePitchMonitor({ tonicHz }) {
    const [active, setActive] = useState(true);
    const [pitchData, setPitchData] = useState(null); // { hz, swara, deviation, color }
    const [signalLevel, setSignalLevel] = useState(0);
    const rafRef = useRef(null);
    const activeRef = useRef(false);
    const lastProcessTimeRef = useRef(0);

    const start = useCallback(async () => {
        try {
            const { sampleRate } = await startMic();
            initPitchDetector(sampleRate);
            setActive(true);
            activeRef.current = true;
        } catch (err) {
            console.error('Mic access failed:', err);
        }
    }, []);

    const stop = useCallback(() => {
        activeRef.current = false;
        setActive(false);
        stopMic();
        setPitchData(null);
        setSignalLevel(0);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, []);

    // Pitch detection loop
    useEffect(() => {
        if (!active) return;

        let smoothHz = null;
        const hzHistory = []; // For median filter

        function loop() {
            // We keep the loop alive even if not activeRef.current 
            // so that once start() sets it to true, it begins processing immediately.
            if (!activeRef.current) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            const buffer = getAudioBuffer();
            if (buffer) {
                // Calculate RMS for signal meter
                let rms = 0;
                for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
                rms = Math.sqrt(rms / buffer.length);

                // Smooth signal level
                setSignalLevel(prev => prev * 0.7 + Math.min(1, rms * 15) * 0.3);

                const hz = detectPitch(buffer);
                const now = performance.now();

                // Target ~10fps (100ms interval) for UI updates
                if (now - lastProcessTimeRef.current < 100) {
                    rafRef.current = requestAnimationFrame(loop);
                    return;
                }
                lastProcessTimeRef.current = now;

                if (hz) {
                    hzHistory.push(hz);
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
                    if (hzHistory.every(h => h === null)) {
                        smoothHz = null;
                    }
                }

                if (smoothHz) {
                    const info = hzToSwara(smoothHz, tonicHz);
                    if (info) {
                        setPitchData({
                            hz: Math.round(smoothHz * 10) / 10,
                            swara: info.swara,
                            deviation: Math.round(info.deviation),
                            color: info.color,
                        });
                    }
                } else {
                    setPitchData(null);
                }
            }

            rafRef.current = requestAnimationFrame(loop);
        }

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [active, tonicHz]);

    useEffect(() => {
        const tryStart = async () => {
            if (active && (!activeRef.current || (rafRef.current === null))) {
                await start();
            }
        };

        // Aggressive interaction listeners
        const events = ['click', 'mousedown', 'pointerdown', 'touchstart', 'keydown', 'focus'];
        events.forEach(e => window.addEventListener(e, tryStart, { once: true }));

        // Initial attempt
        tryStart();

        // Periodic retry (in case interaction happened but context remained suspended)
        const retryInterval = setInterval(() => {
            if (active && !activeRef.current) {
                tryStart();
            }
        }, 2000);

        return () => {
            events.forEach(e => window.removeEventListener(e, tryStart));
            clearInterval(retryInterval);
            if (activeRef.current) {
                stopMic();
                activeRef.current = false;
            }
        };
    }, [active, start]);

    return (
        <div className="glass-card p-5 fade-in">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Live Pitch Monitor
                </h3>
            </div>

            {active && (
                <div className="mt-6 flex flex-col items-center justify-center fade-in">
                    {/* Signal level indicator (subtle) */}
                    <div className="flex items-center gap-2 mb-6 opacity-70">
                        <span className={`w-2 h-2 rounded-full transition-colors ${signalLevel > 0.1 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-[var(--text-muted)]'}`} />
                        <span className="text-xs text-[var(--text-muted)] tracking-wider uppercase">
                            {signalLevel > 0.1 ? 'Mic Active' : 'Waiting for signal...'}
                        </span>
                    </div>

                    {/* Circular Pitch Display */}
                    <div
                        className="relative w-56 h-56 flex flex-col items-center justify-center rounded-full border-[6px] transition-all duration-300 backdrop-blur-sm"
                        style={{
                            borderColor: pitchData ? pitchData.color : 'var(--glass-border)',
                            backgroundColor: pitchData ? `${pitchData.color}15` : 'var(--glass-bg)',
                            boxShadow: pitchData ? `0 0 30px ${pitchData.color}40, inset 0 0 20px ${pitchData.color}20` : 'none',
                            transform: pitchData ? 'scale(1.02)' : 'scale(1)'
                        }}
                    >
                        {pitchData ? (
                            <>
                                <div
                                    className="text-6xl font-bold mb-1 transition-colors duration-200"
                                    style={{ color: pitchData.color, textShadow: `0 2px 10px ${pitchData.color}50` }}
                                >
                                    {pitchData.swara}
                                </div>
                                <div className="text-xl font-semibold text-[var(--text-primary)] bg-[var(--bg-primary)]/50 px-3 py-1 rounded-full backdrop-blur-md">
                                    {pitchData.hz} <span className="text-sm font-normal text-[var(--text-muted)]">Hz</span>
                                </div>

                                <div
                                    className="absolute bottom-6 px-3 py-1 rounded-full text-sm font-bold bg-[var(--bg-primary)]/80 backdrop-blur-md border border-white/10"
                                    style={{ color: pitchData.color }}
                                >
                                    {pitchData.deviation > 0 ? '+' : ''}{pitchData.deviation}¢
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-[var(--text-muted)] flex flex-col items-center px-6">
                                <div className="text-4xl font-light mb-3 opacity-50">—</div>
                                <div className="text-sm leading-relaxed">
                                    {signalLevel > 0.05 ? 'Detecting...' : 'Sing a note to see your pitch'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!active && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                    Check your pitch in real time. See your current swara, frequency, and tuning accuracy.
                </p>
            )}
        </div>
    );
}
