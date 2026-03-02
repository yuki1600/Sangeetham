import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, RotateCw, Music, Play, Pause, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import PitchVisualizer from './PitchVisualizer';
import NoteQueue from './NoteQueue';
import { startMic, stopMic, getAudioBuffer, getSampleRate, hasSignal } from '../utils/audioEngine';
import { initPitchDetector, detectPitch, extractPitchCurveFromAudio } from '../utils/pitchDetection';
import { hzToSwara, simpleSwaraToHz, TONIC_PRESETS } from '../utils/swaraUtils';
import { startDrone, stopDrone, isDronePlaying } from '../utils/droneEngine';

/**
 * ExerciseRunner — orchestrates the guided practice session.
 * Handles countdown, mic, pitch detection loop, auto-advancing notes, and scoring.
 */
export default function ExerciseRunner({ exercise, tonicHz, theme, onTonicChange, onComplete, onStop }) {
    const [phase, setPhase] = useState('playing'); // playing | done
    const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
    const [pitchHistory, setPitchHistory] = useState([]);
    const [referencePitchHistory, setReferencePitchHistory] = useState([]);
    const [fullReferencePitchCurve, setFullReferencePitchCurve] = useState(null);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [micReady, setMicReady] = useState(false);
    const [currentSwara, setCurrentSwara] = useState(null);
    const [referenceSwara, setReferenceSwara] = useState(null);
    const [isPlaying, setIsPlaying] = useState(true);

    const audioRef = useRef(null);
    const audioSourceRef = useRef(null);
    const audioAnalyserRef = useRef(null);
    const audioBufferRef = useRef(null);

    const scoresRef = useRef([]); // Per-note score arrays
    const startTimeRef = useRef(null);
    const noteStartRef = useRef(null);
    const animFrameRef = useRef(null);
    const lastProcessTimeRef = useRef(0);
    const loopsRef = useRef(0);
    const [droneActive, setDroneActive] = useState(isDronePlaying());

    const toggleDrone = useCallback(async () => {
        if (droneActive) {
            stopDrone();
            setDroneActive(false);
        } else {
            await startDrone(tonicHz);
            setDroneActive(true);
        }
    }, [droneActive, tonicHz]);

    const sequence = exercise.sequence;
    const currentTarget = sequence[currentNoteIndex];



    // Start mic and audio when playing begins
    useEffect(() => {
        if (phase !== 'playing') return;

        let cancelled = false;

        const setup = async () => {
            try {
                const { sampleRate } = await startMic();
                initPitchDetector(sampleRate);

                if (exercise.audioUrl && !audioRef.current) {
                    extractPitchCurveFromAudio(exercise.audioUrl).then(curve => {
                        setFullReferencePitchCurve(curve);
                    });

                    const audio = new Audio(exercise.audioUrl);
                    audio.preload = 'auto';
                    audioRef.current = audio;

                    // High-frequency sync loop for audio time
                    const syncLoop = () => {
                        if (!audioRef.current || !isPlaying) return;
                        const timeSec = audioRef.current.currentTime;
                        const timeMs = timeSec * 1000;

                        // Sync index
                        let elapsed = 0;
                        for (let i = 0; i < sequence.length; i++) {
                            if (timeMs >= elapsed && timeMs < elapsed + sequence[i].durationMs) {
                                setCurrentNoteIndex(i);
                                break;
                            }
                            elapsed += sequence[i].durationMs;
                        }

                        setAudioCurrentTime(audio.currentTime);

                        // Always keep state in sync
                        // (We call this directly instead of ontimeupdate for precision)
                        animFrameRef.current = requestAnimationFrame(syncLoop);
                    };

                    audio.onplay = () => {
                        animFrameRef.current = requestAnimationFrame(syncLoop);
                    };
                    audio.onpause = () => {
                        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                    };
                    audio.onended = () => {
                        audio.currentTime = 0;
                        audio.play();
                        loopsRef.current += 1;
                    };

                    await audio.play().catch(e => console.error("Audio play failed:", e));
                }

                if (!cancelled) {
                    setMicReady(true);
                    startTimeRef.current = performance.now();
                    noteStartRef.current = performance.now();
                    scoresRef.current = sequence.map(() => []);
                }
            } catch (err) {
                console.error('Mic setup failed:', err);
            }
        };

        setup();

        return () => {
            cancelled = true;
            stopMic();
            if (audioRef.current) {
                audioRef.current.onplay = null;
                audioRef.current.onpause = null;
                audioRef.current.onended = null;
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            setMicReady(false);
        };
    }, [phase, sequence, exercise.audioUrl]);

    // Play/Pause control
    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error("Play failed:", e));
            setIsPlaying(true);
        }
    }, [isPlaying]);

    // Pitch detection loop
    useEffect(() => {
        if (phase !== 'playing' || !micReady) return;

        let rafId;
        let smoothHz = null;
        const hzHistory = [];

        const loop = () => {
            const buffer = getAudioBuffer();
            if (buffer) {
                const rawHz = detectPitch(buffer);
                const now = performance.now();

                // Target 10 samples per second (100ms interval) for responsive trail
                if (now - lastProcessTimeRef.current < 100) {
                    rafId = requestAnimationFrame(loop);
                    return;
                }
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
                    if (hzHistory.every(h => h === null)) {
                        smoothHz = null;
                    }
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

                    // Add to pitch history
                    const sampleTime = (exercise.audioUrl && audioRef.current)
                        ? audioRef.current.currentTime * 1000
                        : now;

                    setPitchHistory(prev => {
                        const newHistory = [...prev, { time: sampleTime, hz: smoothHz }];
                        // Keep last 10 seconds
                        const window = 10000;
                        return newHistory.filter(p => sampleTime - p.time < window);
                    });

                    // Score: check if pitch is close to target
                    if (scoresRef.current[currentNoteIndex]) {
                        const targetHz = simpleSwaraToHz(currentTarget.swara, tonicHz);
                        if (targetHz) {
                            const targetInfo = hzToSwara(targetHz, tonicHz);
                            if (swaraInfo && targetInfo) {
                                const dev = Math.abs(swaraInfo.cents - targetInfo.cents);
                                // Handle wrap at octave boundary
                                const adjDev = dev > 600 ? 1200 - dev : dev;
                                const isHit = adjDev <= 35;
                                scoresRef.current[currentNoteIndex].push(isHit ? 1 : 0);
                            }
                        }
                    }
                } else {
                    const sampleTime = (exercise.audioUrl && audioRef.current)
                        ? audioRef.current.currentTime * 1000
                        : now;
                    setPitchHistory(prev => {
                        const newHistory = [...prev, { time: sampleTime, hz: null }];
                        return newHistory.filter(p => sampleTime - p.time < 10000);
                    });
                }

                // --- Handle Reference Pitch (Audio File) ---
                if (exercise.audioUrl && audioRef.current) {
                    const refHz = simpleSwaraToHz(currentTarget.swara, tonicHz);
                    if (refHz) {
                        const refSwaraInfo = hzToSwara(refHz, tonicHz);
                        setReferenceSwara({ ...refSwaraInfo, hz: refHz });
                    }
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(rafId);
    }, [phase, micReady, tonicHz, currentNoteIndex, currentTarget, exercise.audioUrl, isPlaying]);

    // Handle tonicHz (Shruti) changes dynamically
    useEffect(() => {
        if (droneActive) {
            // Restart the drone with the new tonicHz
            stopDrone();
            startDrone(tonicHz);
        }
    }, [tonicHz, droneActive]);

    // Auto-advance notes (Only for non-audio exercises)
    useEffect(() => {
        if (phase !== 'playing' || !micReady || exercise.audioUrl) return;

        noteStartRef.current = performance.now();

        const timer = setTimeout(() => {
            if (currentNoteIndex < sequence.length - 1) {
                setCurrentNoteIndex(prev => prev + 1);
            } else {
                loopsRef.current += 1;
                setCurrentNoteIndex(0);
            }
        }, currentTarget.durationMs);

        return () => clearTimeout(timer);
    }, [phase, micReady, currentNoteIndex, sequence, currentTarget, exercise.audioUrl]);

    // When exercise completes
    useEffect(() => {
        if (phase !== 'done') return;

        stopMic();

        const endTime = performance.now();
        const durationSec = startTimeRef.current
            ? Math.round((endTime - startTimeRef.current) / 1000)
            : 0;

        // Only score notes that were actually attempted
        const attemptedCount = loopsRef.current > 0
            ? sequence.length
            : Math.min(currentNoteIndex + 1, sequence.length);

        const scores = scoresRef.current.length > 0 ? scoresRef.current : sequence.map(() => []);

        const noteResults = scores.slice(0, attemptedCount).map((samples, i) => {
            if (samples.length === 0) return { swara: sequence[i].swara, accuracy: 0, hit: false };
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            return {
                swara: sequence[i].swara,
                accuracy: Math.round(avg * 100),
                hit: avg >= 0.5,
            };
        });

        const overallAccuracy = noteResults.length > 0
            ? Math.round(noteResults.reduce((a, n) => a + n.accuracy, 0) / noteResults.length)
            : 0;

        onComplete({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            accuracy: overallAccuracy,
            noteResults,
            durationSec,
        });
    }, [phase, exercise, sequence, currentNoteIndex, onComplete]);

    if (phase === 'done') {
        return null; // Or return a loading spinner while processing results
    }

    // Playing screen
    return (
        <div className="practice-screen flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
            {/* Rotate prompt for portrait */}
            <div className="rotate-prompt">
                <div className="flex items-center gap-2 text-[var(--accent-purple)]">
                    <Smartphone className="w-12 h-12" />
                    <RotateCw className="w-8 h-8 animate-spin-slow" />
                </div>
                <p className="font-semibold">Please rotate your device to landscape</p>
            </div>

            {/* Top Navigation & Status Bar */}
            <header className="practice-header flex items-center justify-between px-6 py-4 bg-[var(--bg-card)]/30 backdrop-blur-xl border-b border-[var(--glass-border)] z-20">
                {/* Left: Back + Branding */}
                <div className="flex-1 flex items-center gap-3">
                    <button
                        onClick={onStop}
                        className="w-9 h-9 flex items-center justify-center rounded-xl themed-glass text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] transition-all duration-300"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <Music className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Sangeetham</span>
                        <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-black">Practice Mode</span>
                    </div>
                </div>

                {/* Center: Playback & Pitch Intelligence */}
                <div className="flex-[2] flex items-center justify-center gap-8">
                    {/* Play/Pause Button (only if audio exists) */}
                    {exercise.audioUrl && (
                        <button
                            onClick={togglePlay}
                            className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${isPlaying
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white text-slate-900 border border-white'
                                }`}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                        </button>
                    )}

                    {currentSwara ? (
                        <div className="flex items-center gap-5 themed-glass px-6 py-2 rounded-2xl fade-in">
                            <div className={`text-4xl font-black transition-colors duration-300 ${Math.abs(currentSwara.deviation) <= 15 ? 'text-emerald-400' :
                                Math.abs(currentSwara.deviation) <= 35 ? 'text-yellow-400' : 'text-[var(--text-secondary)]'
                                }`}>
                                {currentSwara.swara}
                            </div>
                            <div className="w-px h-8 bg-[var(--glass-border)]" />
                            <div className="flex flex-col items-start leading-tight">
                                <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                                    {currentSwara.hz.toFixed(1)} <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest ml-1">Hz</span>
                                </div>
                                <div className={`text-[11px] font-black tracking-widest uppercase ${Math.abs(currentSwara.deviation) <= 15 ? 'text-emerald-400' :
                                    Math.abs(currentSwara.deviation) <= 35 ? 'text-yellow-400' : 'text-[var(--text-muted)]'
                                    }`}>
                                    {currentSwara.deviation > 0 ? '+' : ''}{currentSwara.deviation}¢
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 opacity-50">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-primary)]">Listening...</span>
                        </div>
                    )}
                </div>

                {/* Right: Pro Controls & Exit */}
                <div className="flex-1 flex justify-end items-center gap-5">
                    <div className="flex flex-col items-end gap-2">
                        <div className="grid grid-cols-6 gap-1">
                            {TONIC_PRESETS.map((t) => {
                                const isSelected = t.hz === tonicHz;
                                return (
                                    <button
                                        key={t.name}
                                        onClick={() => onTonicChange(t.hz)}
                                        className={`
                                            w-8 h-8 rounded-lg text-[10px] font-bold transition-all duration-200
                                            ${isSelected
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-110'
                                                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'
                                            }
                                        `}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleDrone}
                            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${droneActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'themed-glass text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            title="Toggle Drone"
                        >
                            {droneActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Engine Area */}
            <main className="flex-1 relative overflow-hidden">
                <PitchVisualizer
                    tonicHz={tonicHz}
                    pitchHistory={pitchHistory}
                    fullReferencePitchCurve={fullReferencePitchCurve}
                    isActive={phase === 'playing'}
                    theme={theme}
                    sequence={exercise.audioUrl ? sequence : null}
                    audioCurrentTime={exercise.audioUrl ? audioCurrentTime : performance.now() / 1000}
                />
            </main>
        </div>
    );
}
