import { useEffect, useRef, useState } from 'react';
import { startMic, stopMic, getAudioBuffer, getAudioContextState, resumeAudioContext } from '../utils/audioEngine';
import { initPitchDetector, detectPitch } from '../utils/pitchDetection';
import { hzToSwara } from '../utils/swaraUtils';

/**
 * Live pitch monitoring hook.
 *
 * Acquires the microphone (auto-starts on first user gesture), runs the
 * pitch-detection loop with median filtering + exponential smoothing,
 * and returns the latest swara info.
 *
 * Consolidates the loop previously duplicated in CompactPitchBar, TonicBar,
 * and ExerciseRunner.
 *
 * @param {number} tonicHz                  Sa frequency for swara conversion
 * @param {object} [opts]
 * @param {boolean} [opts.enabled=true]     Toggle the loop without unmounting
 * @param {number} [opts.throttleMs=100]    Min ms between processed samples
 * @param {(hz:number|null, info:object|null)=>void} [opts.onSample]
 *                                          Optional callback fired after each
 *                                          processed sample (for scoring,
 *                                          history capture, etc.). Use refs
 *                                          inside this callback if you need
 *                                          access to live state.
 * @param {boolean} [opts.signalLevel=false] When true, exposes a smoothed
 *                                          0..1 RMS level on the return value.
 * @param {boolean} [opts.watchdog=false]   When true, restarts the loop and
 *                                          resumes a suspended AudioContext
 *                                          if the loop stalls > 1 s.
 *
 * @returns {{ pitchData: {hz, swara, deviation, color, swaraIndex} | null,
 *             signalLevel: number,
 *             micReady: boolean,
 *             isMicActive: boolean }}
 */
export function usePitchDetection(tonicHz, opts = {}) {
    const {
        enabled = true,
        throttleMs = 50,
        onSample,
        signalLevel: trackSignalLevel = false,
        watchdog = true,
    } = opts;

    const [pitchData, setPitchData] = useState(null);
    const [signalLevel, setSignalLevel] = useState(0);
    const [micReady, setMicReady] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);

    const tonicHzRef = useRef(tonicHz);
    const onSampleRef = useRef(onSample);
    const enabledRef = useRef(enabled);
    const lastProcessTimeRef = useRef(0);
    const lastLoopTimeRef = useRef(0);
    const rafRef = useRef(null);
    const micActiveRef = useRef(false);

    useEffect(() => { tonicHzRef.current = tonicHz; }, [tonicHz]);
    useEffect(() => { onSampleRef.current = onSample; }, [onSample]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    // ── Mic acquisition ───────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) {
            micActiveRef.current = false;
            setIsMicActive(false);
            return;
        }

        let cancelled = false;
        const setup = async () => {
            try {
                const { sampleRate } = await startMic();
                if (cancelled) {
                    stopMic(); // release the refcount we just acquired
                    return;
                }
                initPitchDetector(sampleRate);
                micActiveRef.current = true;
                setMicReady(true);
                setIsMicActive(true);
            } catch (err) {
                console.error('Mic setup failed:', err);
                micActiveRef.current = false;
                setIsMicActive(false);
            }
        };
        setup();
        return () => {
            cancelled = true;
            micActiveRef.current = false;
            setIsMicActive(false);
            stopMic(); // release our ref — stream stays alive if others hold it
        };
    }, [enabled]);

    // ── Pitch detection loop ──────────────────────────────────────────────
    useEffect(() => {
        if (!micReady) return undefined;

        lastLoopTimeRef.current = performance.now();
        let smoothHz = null;
        const hzHistory = [];

        const loop = () => {
            lastLoopTimeRef.current = performance.now();

            if (!enabledRef.current || !micActiveRef.current) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            try {
                const buffer = getAudioBuffer();
                if (buffer) {
                    if (trackSignalLevel) {
                        let rms = 0;
                        for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
                        rms = Math.sqrt(rms / buffer.length);
                        setSignalLevel(prev => prev * 0.7 + Math.min(1, rms * 15) * 0.3);
                    }

                    const rawHz = detectPitch(buffer);
                    const now = performance.now();

                    if (now - lastProcessTimeRef.current >= throttleMs) {
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

                        let info = null;
                        if (smoothHz) {
                            info = hzToSwara(smoothHz, tonicHzRef.current);
                            if (info) {
                                setPitchData({
                                    ...info,
                                    hz: Math.round(smoothHz * 10) / 10,
                                    deviation: Math.round(info.deviation),
                                });
                            } else {
                                setPitchData(null);
                            }
                        } else {
                            setPitchData(null);
                        }

                        if (onSampleRef.current) onSampleRef.current(smoothHz, info);
                    }
                }
            } catch (err) {
                console.error('Pitch detection loop error:', err);
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [micReady, throttleMs, trackSignalLevel]);

    // ── Watchdog: keep the loop alive if AudioContext suspends ────────────
    useEffect(() => {
        if (!watchdog || !micReady) return undefined;
        const interval = setInterval(async () => {
            if (!micActiveRef.current) return;
            // If the analyser buffer is gone (stream was torn down externally)
            // re-acquire the mic transparently without affecting the ref count
            // that other components hold.
            if (!getAudioBuffer()) {
                try {
                    console.warn('usePitchDetection watchdog: mic stream lost, re-acquiring');
                    const { sampleRate } = await startMic();
                    initPitchDetector(sampleRate);
                } catch (err) {
                    console.error('usePitchDetection watchdog: mic re-acquire failed', err);
                }
            }
            const diff = performance.now() - lastLoopTimeRef.current;
            if (diff > 1000) {
                console.warn('usePitchDetection watchdog: loop stalled, restarting');
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            }
            if (getAudioContextState() === 'suspended') {
                resumeAudioContext();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [watchdog, micReady]);

    return { pitchData, signalLevel, micReady, isMicActive };
}
