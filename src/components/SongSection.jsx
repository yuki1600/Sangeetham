import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Music, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw, Repeat } from 'lucide-react';
import CompactPitchBar from './CompactPitchBar';
import LaneLabel from './LaneLabel';
import NotationLane from './NotationLane';
import { buildAavartanas } from '../utils/songParser';

/** Duration of one aavartana in seconds */
const AAVARTANA_SEC = 3.3;

/** Pixel width of one aavartana column in the scrolling grid */
const AAVARTANA_PX = 320;

// ─── WaveformCanvas ───────────────────────────────────────────────────────────

function WaveformCanvas({ audioUrl, currentTime, totalDuration, playheadFraction = 0.25 }) {
    const canvasRef = useRef(null);
    const samplesRef = useRef(null);
    const animRef = useRef(null);

    // Decode audio and extract waveform samples once
    useEffect(() => {
        if (!audioUrl) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(audioUrl);
                const buf = await res.arrayBuffer();
                const ctx = new OfflineAudioContext(1, 1, 44100);
                const decoded = await ctx.decodeAudioData(buf);
                const raw = decoded.getChannelData(0);
                // Downsample to ~2000 points for rendering
                const TARGET = 2000;
                const step = Math.floor(raw.length / TARGET);
                const samples = new Float32Array(TARGET);
                for (let i = 0; i < TARGET; i++) {
                    let max = 0;
                    for (let j = 0; j < step; j++) {
                        const v = Math.abs(raw[i * step + j] || 0);
                        if (v > max) max = v;
                    }
                    samples[i] = max;
                }
                if (!cancelled) samplesRef.current = { samples, duration: decoded.duration };
            } catch (e) {
                console.warn('Waveform decode error:', e);
            }
        })();

        return () => { cancelled = true; };
    }, [audioUrl]);

    // Draw frame
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) { animRef.current = requestAnimationFrame(draw); return; }

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            const W = rect.width;
            const H = rect.height;

            ctx.clearRect(0, 0, W, H);

            const data = samplesRef.current;
            if (!data || data.duration === 0) {
                // Placeholder bars
                ctx.fillStyle = 'rgba(16,185,129,0.2)';
                for (let i = 0; i < 60; i++) {
                    const h = H * 0.2 + Math.random() * H * 0.5;
                    ctx.fillRect(i * (W / 60), (H - h) / 2, W / 60 - 1, h);
                }
                animRef.current = requestAnimationFrame(draw);
                return;
            }

            const { samples, duration } = data;
            const playheadX = W * playheadFraction;
            const progress = currentTime / duration; // 0..1

            // Map sample index → x position
            // samples[i] corresponds to time = (i / samples.length) * duration
            // x on canvas = playheadX + (sampleTime - currentTime) / duration * W_per_sec
            // We want W to show `visibleSec` seconds of audio
            const visibleSec = W / (AAVARTANA_PX / AAVARTANA_SEC);

            for (let i = 0; i < samples.length; i++) {
                const sampleTime = (i / samples.length) * duration;
                const relSec = sampleTime - currentTime;
                const x = playheadX + (relSec / visibleSec) * W;
                if (x < -2 || x > W + 2) continue;

                const amp = samples[i];
                const barH = Math.max(2, amp * H * 0.85);
                const isPast = x < playheadX;

                const alpha = isPast ? 0.35 : 0.75;
                ctx.fillStyle = `rgba(16,185,129,${alpha})`;
                ctx.fillRect(x - 1, (H - barH) / 2, 2, barH);
            }

            animRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [audioUrl, currentTime, playheadFraction]);

    return (
        <div className="w-full h-full block">
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
}

// ─── Playhead ─────────────────────────────────────────────────────────────────

function Playhead({ fraction }) {
    return (
        <div
            className="absolute inset-y-0 z-20 pointer-events-none"
            style={{ left: `${fraction * 100}%` }}
        >
            {/* Glow */}
            <div
                className="absolute inset-y-0"
                style={{
                    width: 24,
                    left: -12,
                    background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.18), transparent)',
                }}
            />
            {/* Line */}
            <div
                className="absolute inset-y-0 w-1"
                style={{
                    left: -0.5,
                    background: '#10b981',
                    boxShadow: '0 0 12px rgba(16,185,129,0.4)',
                }}
            />
            {/* Top diamond */}
            <div
                className="absolute"
                style={{
                    top: 0,
                    left: -5,
                    width: 10,
                    height: 10,
                    background: '#10b981',
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    boxShadow: '0 0 8px rgba(16,185,129,0.8)',
                }}
            />
        </div>
    );
}

// ─── Main SongSection ─────────────────────────────────────────────────────────

/**
 * Map songViewId → { jsonUrl, audioUrl }
 * Add entries here when new songs are added to public/.
 */
const SONG_ASSET_MAP = {
    lambodhara: {
        jsonUrl: '/lambodhara.json',
        audioUrl: '/Sree Gananatha_trimmed.mp3',
    },
};

export default function SongSection({ song, onBack, theme, tonicHz, onTonicChange }) {
    const [composition, setComposition] = useState(null);
    const [songDetails, setSongDetails] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [currentSection, setCurrentSection] = useState('');
    const [currentAvIdx, setCurrentAvIdx] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoopEnabled, setIsLoopEnabled] = useState(false);
    const [loopRange, setLoopRange] = useState(null); // { start, end } in seconds
    const [preLoopTime, setPreLoopTime] = useState(null);
    const [sahityaCollapsed, setSahityaCollapsed] = useState(false);
    const [swaraCollapsed, setSwaraCollapsed] = useState(false);
    const dragData = useRef({ startX: 0, startTime: 0, isSelecting: false, selectionStart: 0 });

    const audioRef = useRef(null);
    const animRef = useRef(null);
    const isDark = theme !== 'light';

    const PLAYHEAD = 0.25;

    // Resolve asset URLs from the song prop
    const songAssets = SONG_ASSET_MAP[song?.songViewId] || {};
    const jsonUrl = song?.jsonUrl || songAssets.jsonUrl || `/${song?.songViewId}.json`;
    const audioUrl = song?.audioUrl || songAssets.audioUrl || `/${song?.songViewId}.mp3`;

    // Load composition JSON
    useEffect(() => {
        if (!jsonUrl) return;
        fetch(jsonUrl)
            .then(r => r.json())
            .then(data => {
                setComposition(data.composition);
                setSongDetails(data.song_details);
            })
            .catch(e => console.error('Failed to load composition JSON:', e));
    }, [jsonUrl]);

    // Set up audio element
    useEffect(() => {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setTotalDuration(audio.duration);
        });
        audio.addEventListener('ended', () => {
            setIsPlaying(false);
        });

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [audioUrl]);

    // RAF sync loop
    useEffect(() => {
        const tick = () => {
            if (audioRef.current) {
                let t = audioRef.current.currentTime;

                // Looping logic
                if (isPlaying && isLoopEnabled && loopRange && t >= loopRange.end) {
                    audioRef.current.currentTime = loopRange.start;
                    t = loopRange.start;
                }

                setCurrentTime(t);
            }
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [isPlaying, isLoopEnabled, loopRange]);

    // Derive current aavartana index & section from currentTime
    const aavartanas = composition ? buildAavartanas(composition) : [];

    useEffect(() => {
        if (aavartanas.length === 0) return;
        const idx = Math.min(
            Math.floor(currentTime / AAVARTANA_SEC),
            aavartanas.length - 1
        );
        setCurrentAvIdx(idx);
        setCurrentSection(aavartanas[idx]?.section || '');
    }, [currentTime, aavartanas.length]);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error('Play failed:', e));
            setIsPlaying(true);
        }
    }, [isPlaying]);

    // Spacebar play/pause
    useEffect(() => {
        const onKey = (e) => {
            if (e.code !== 'Space') return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            togglePlay();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [togglePlay]);

    const restartAudio = useCallback(() => {
        if (!audioRef.current) return;
        const targetTime = (isLoopEnabled && loopRange) ? loopRange.start : 0;
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [isPlaying, isLoopEnabled, loopRange]);

    // Unified Drag Handlers
    const handleDragStart = useCallback((e) => {
        setIsDragging(true);
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;

        const isSelecting = isLoopEnabled;
        const startTime = currentTime + ((clickX - playheadX) / AAVARTANA_PX * AAVARTANA_SEC);

        dragData.current = {
            startX: x,
            startTime: currentTime,
            selectionStart: startTime,
            isSelecting
        };

        if (isSelecting) {
            if (loopRange === null) {
                setPreLoopTime(currentTime);
            }
            setLoopRange({ start: startTime, end: startTime });
        }
    }, [currentTime, isLoopEnabled, loopRange, PLAYHEAD]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;

        if (dragData.current.isSelecting) {
            const currentT = currentTime + ((clickX - playheadX) / AAVARTANA_PX * AAVARTANA_SEC);
            const start = Math.min(dragData.current.selectionStart, currentT);
            const end = Math.max(dragData.current.selectionStart, currentT);
            setLoopRange({
                start: Math.max(0, start),
                end: Math.min(totalDuration, end)
            });
        } else {
            const deltaX = x - dragData.current.startX;
            const deltaT = -(deltaX / AAVARTANA_PX) * AAVARTANA_SEC;
            let newTime = dragData.current.startTime + deltaT;
            newTime = Math.max(0, Math.min(newTime, totalDuration));

            if (audioRef.current) {
                audioRef.current.currentTime = newTime;
            }
            setCurrentTime(newTime);
        }
    }, [isDragging, totalDuration, currentTime, PLAYHEAD]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        if (dragData.current.isSelecting && loopRange) {
            if (audioRef.current) {
                audioRef.current.currentTime = loopRange.start;
            }
            setCurrentTime(loopRange.start);
        }
    }, [loopRange]);

    // Also support a simple click to seek if drag distance is tiny
    const handleClickSeek = useCallback((e) => {
        const x = e.clientX || (e.touches && e.touches[0].clientX);
        const deltaX = Math.abs(x - dragData.current.startX);
        if (deltaX < 5) {
            // If a loop exists and we click (not drag), revert to pre-loop position
            if (isLoopEnabled && loopRange) {
                if (preLoopTime !== null) {
                    if (audioRef.current) {
                        audioRef.current.currentTime = preLoopTime;
                    }
                    setCurrentTime(preLoopTime);
                }
                setLoopRange(null);
                setPreLoopTime(null);
                return;
            }

            if (isLoopEnabled) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = x - rect.left;
            const playheadX = rect.width * PLAYHEAD;
            const deltaT = (clickX - playheadX) / AAVARTANA_PX * AAVARTANA_SEC;
            let newTime = currentTime + deltaT;
            newTime = Math.max(0, Math.min(newTime, totalDuration));
            if (audioRef.current) {
                audioRef.current.currentTime = newTime;
            }
            setCurrentTime(newTime);
        }
    }, [currentTime, totalDuration, isLoopEnabled, loopRange, preLoopTime, PLAYHEAD]);

    // Progress bar seek
    const handleSeek = useCallback((e) => {
        if (!audioRef.current || totalDuration === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        const t = frac * totalDuration;
        audioRef.current.currentTime = t;
        setCurrentTime(t);
    }, [totalDuration]);

    // Format mm:ss
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    // Progress fraction
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

    const bg = isDark ? 'var(--bg-primary)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    return (
        <div
            className="flex flex-col h-full"
            style={{ background: bg, color: 'var(--text-primary)' }}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header
                className="flex flex-col z-30 flex-shrink-0"
                style={{
                    background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(248,250,252,0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                {/* Row 1: Pitch Bar & Song Info (Combined/Centered) */}
                <div className="flex flex-col items-center pt-4 pb-2">
                    <div className="w-full flex items-center justify-center relative px-5 mb-2">
                        {/* Info (Positioned absolute left to keep pitch bar centered) */}
                        <div className="absolute left-5 flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border transition-all duration-200"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    borderColor,
                                }}
                                title="Back"
                            >
                                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </button>
                            <div className="flex flex-col">
                                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                                    {songDetails?.title || song?.title || 'Lambodara Lakumikara'}
                                </div>
                                <div className="text-[9px] uppercase tracking-widest font-black opacity-60">
                                    {songDetails?.raga || 'Malahari'} · {songDetails?.tala || 'Rupakam'}
                                </div>
                            </div>
                        </div>

                        {/* Centered Pitch Bar */}
                        <CompactPitchBar
                            tonicHz={tonicHz}
                            onTonicChange={onTonicChange}
                            theme={theme}
                        />
                    </div>
                </div>

                {/* Row 2: Playback Controls & Aavartana */}
                <div className="flex items-center justify-center gap-8 pb-5">
                    <div className="flex items-center gap-6 px-8 py-2 rounded-3xl"
                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                        {/* Section badge */}
                        <div
                            className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
                            style={{
                                color: '#34d399',
                                borderColor: 'rgba(52,211,153,0.3)',
                                background: 'rgba(52,211,153,0.1)',
                            }}
                        >
                            {currentSection || 'Pallavi'}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const targetState = !isLoopEnabled;
                                    setIsLoopEnabled(targetState);
                                    if (!targetState) {
                                        setLoopRange(null);
                                        setPreLoopTime(null);
                                    }
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 border ${isLoopEnabled
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    : `border-transparent opacity-40 hover:opacity-100 ${isDark ? 'text-white' : 'text-black'}`
                                    }`}
                                title="Loop Mode"
                            >
                                <Repeat className="w-5 h-5" />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
                                style={{
                                    background: isPlaying
                                        ? 'rgba(16,185,129,0.15)'
                                        : 'linear-gradient(135deg, #10b981, #059669)',
                                    border: `1px solid ${isPlaying ? 'rgba(16,185,129,0.4)' : 'transparent'}`,
                                }}
                            >
                                {isPlaying
                                    ? <Pause className="w-6 h-6" style={{ color: '#10b981' }} />
                                    : <Play className="w-6 h-6 fill-current text-white" />
                                }
                            </button>

                            <button
                                onClick={restartAudio}
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    borderColor,
                                }}
                                title="Restart"
                            >
                                <RotateCcw className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <span
                                className="text-sm tabular-nums font-mono font-bold tracking-tight"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {fmt(currentTime)} / {fmt(totalDuration)}
                            </span>

                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                            >
                                <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {currentAvIdx + 1}
                                </span>
                                <span className="opacity-40 text-xs">/</span>
                                <span className="opacity-60 text-xs font-bold">{aavartanas.length}</span>
                                <span className="text-[10px] uppercase font-black tracking-widest opacity-40 ml-1">aavartanas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Three Lanes ────────────────────────────────────────────────── */}
            <main
                className={`flex-1 flex flex-col relative overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onClick={handleClickSeek}
            >
                {/* Shared playhead overlay (spans all three lanes) */}
                <Playhead fraction={PLAYHEAD} />

                {/* Selection Overlay */}
                {loopRange && (
                    <div
                        className="absolute inset-y-0 z-10 pointer-events-none transition-none"
                        style={{
                            left: `calc(${PLAYHEAD * 100}% + ${(loopRange.start - currentTime) / AAVARTANA_SEC * AAVARTANA_PX}px)`,
                            width: `${(loopRange.end - loopRange.start) / AAVARTANA_SEC * AAVARTANA_PX}px`,
                            background: 'rgba(16,185,129,0.15)',
                            borderLeft: '1px solid rgba(16,185,129,0.5)',
                            borderRight: '1px solid rgba(16,185,129,0.5)',
                            willChange: 'left, width'
                        }}
                    >
                        {/* Label */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                            <Repeat className="w-12 h-12 text-emerald-400" />
                        </div>
                    </div>
                )}

                {/* Lane 1: Waveform */}
                <div
                    className="relative flex-shrink-0 pointer-events-none"
                    style={{
                        height: 120,
                        borderBottom: `1px solid ${borderColor}`,
                    }}
                >
                    <LaneLabel label="Audio" isDark={isDark} />
                    <WaveformCanvas
                        audioUrl={audioUrl}
                        currentTime={currentTime}
                        totalDuration={totalDuration}
                        playheadFraction={PLAYHEAD}
                    />
                </div>

                {/* Lane 2: Sahitya */}
                <div
                    className="relative flex-shrink-0 transition-all duration-200"
                    style={{
                        height: sahityaCollapsed ? 28 : 140,
                        borderBottom: `1px solid ${borderColor}`,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 z-30 flex items-center cursor-pointer select-none"
                        style={{ height: '28px', pointerEvents: 'auto' }}
                        onClick={() => setSahityaCollapsed(c => !c)}
                    >
                        <div className="flex items-center gap-1.5 ml-4 text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg"
                            style={{
                                color: isDark ? '#fff' : '#000',
                                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                backdropFilter: 'blur(12px)',
                                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 15px rgba(0,0,0,0.08)',
                            }}
                        >
                            {sahityaCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            Sahitya
                        </div>
                    </div>
                    {!sahityaCollapsed && aavartanas.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                            <NotationLane
                                aavartanas={aavartanas}
                                currentTime={currentTime}
                                totalDuration={totalDuration}
                                playheadFraction={PLAYHEAD}
                                type="sahitya"
                                theme={theme}
                            />
                        </div>
                    )}
                </div>

                {/* Lane 3: Swara */}
                <div
                    className="relative transition-all duration-200"
                    style={{
                        flexShrink: 0,
                        height: swaraCollapsed ? 28 : 140,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 z-30 flex items-center cursor-pointer select-none"
                        style={{ height: '28px', pointerEvents: 'auto' }}
                        onClick={() => setSwaraCollapsed(c => !c)}
                    >
                        <div className="flex items-center gap-1.5 ml-4 text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg"
                            style={{
                                color: isDark ? '#fff' : '#000',
                                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                backdropFilter: 'blur(12px)',
                                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 15px rgba(0,0,0,0.08)',
                            }}
                        >
                            {swaraCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            Swara
                        </div>
                    </div>
                    {!swaraCollapsed && aavartanas.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                            <NotationLane
                                aavartanas={aavartanas}
                                currentTime={currentTime}
                                totalDuration={totalDuration}
                                playheadFraction={PLAYHEAD}
                                type="swara"
                                theme={theme}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* ── Progress Bar ───────────────────────────────────────────────── */}
            <div
                className="flex-shrink-0 px-5 py-3 flex items-center gap-3 z-30"
                style={{
                    background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(248,250,252,0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderTop: `1px solid ${borderColor}`,
                }}
            >
                <span className="text-[10px] tabular-nums font-mono" style={{ color: 'var(--text-muted)', minWidth: 36 }}>
                    {fmt(currentTime)}
                </span>

                {/* Track */}
                <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden cursor-pointer relative"
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                    onClick={handleSeek}
                >
                    {/* Fill */}
                    <div
                        className="absolute inset-y-0 left-0 rounded-full transition-none"
                        style={{
                            width: `${progress * 100}%`,
                            background: 'linear-gradient(to right, #10b981, #34d399)',
                        }}
                    />
                    {/* Aavartana tick marks */}
                    {aavartanas.map((_, i) => {
                        const frac = (i * AAVARTANA_SEC) / (totalDuration || 1);
                        if (frac >= 1) return null;
                        return (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-px opacity-30"
                                style={{
                                    left: `${frac * 100}%`,
                                    background: isDark ? '#fff' : '#000',
                                }}
                            />
                        );
                    })}
                </div>

                <span className="text-[10px] tabular-nums font-mono" style={{ color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
                    {fmt(totalDuration)}
                </span>
            </div>
        </div>
    );
}


