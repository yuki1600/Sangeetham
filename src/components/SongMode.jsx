import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Play, Pause, Loader, Music2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { parseSongJson } from '../utils/songParser';
import { startMic, stopMic, getAudioBuffer } from '../utils/audioEngine';
import { initPitchDetector, detectPitch } from '../utils/pitchDetection';
import { hzToSwara, TONIC_PRESETS } from '../utils/swaraUtils';
import { startDrone, stopDrone, isDronePlaying } from '../utils/droneEngine';

// ── Layout constants ──────────────────────────────────────────────────────────
const TILE_W = 72;           // px per akshara (beat unit)
const SIDEBAR_W = 120;       // width of the fixed labels sidebar
const PLAYHEAD_RATIO = 0.35; // playhead sits at 35% from left edge
// Pitch area swara reference rows (Sa to Sa'', relative semitones from tonic)
const PITCH_ROWS = [
    { sem: -12, label: 'Sa₋', color: '#10b981' },
    { sem: 0, label: 'Sa', color: '#10b981' },
    { sem: 2, label: 'Ri', color: '#3b82f6' },
    { sem: 4, label: 'Ga', color: '#f59e0b' },
    { sem: 5, label: 'Ma', color: '#f97316' },
    { sem: 7, label: 'Pa', color: '#8b5cf6' },
    { sem: 9, label: 'Da', color: '#ec4899' },
    { sem: 11, label: 'Ni', color: '#f43f5e' },
    { sem: 12, label: "Sa'", color: '#10b981' },
    { sem: 14, label: "Ri'", color: '#3b82f6' },
    { sem: 16, label: "Ga'", color: '#f59e0b' },
    { sem: 17, label: "Ma'", color: '#f97316' },
    { sem: 19, label: "Pa'", color: '#8b5cf6' },
    { sem: 21, label: "Da'", color: '#ec4899' },
    { sem: 23, label: "Ni'", color: '#f43f5e' },
    { sem: 24, label: "Sa''", color: '#10b981' },
];

// ── Canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function hexRgba(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SongMode({ onBack, theme, tonicHz = 130.81, onTonicChange, songId = 'mathe' }) {
    // Canvas & audio refs
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const animRef = useRef(null);

    // Data refs (read inside rAF — no re-render needed)
    const tokensRef = useRef([]);
    const noteCountRef = useRef(0);
    const waveformRef = useRef(null); // Float32Array, length = noteCount
    const durationRef = useRef(0);
    const currentTimeRef = useRef(0);
    const themeRef = useRef(theme);
    const tonicHzRef = useRef(tonicHz);
    const timestampedSahityaRef = useRef([]); // [{ start, end, text, meaning, full_sentence }]

    // Mic / pitch detection refs
    const pitchTrailRef = useRef([]);   // [{ t: perfNow_ms, hz: number|null }]
    const lastPitchMsRef = useRef(0);

    // Seeking / drag state
    const seekbarRef = useRef(null); // { y, h } set during draw
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartTimeRef = useRef(0);

    // UI state (React re-renders only when these change)
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [micActive, setMicActive] = useState(false);
    const [sectionName, setSectionName] = useState('');
    const lastSectionRef = useRef('');
    const [currentSwara, setCurrentSwara] = useState(null);
    const [droneActive, setDroneActive] = useState(isDronePlaying());

    // Asset paths mapping
    const songAssets = useMemo(() => {
        if (songId === 'lambodhara') {
            return {
                json: '/lambodhara.json',
                audio: '/lambodhara.mp3',
                timestamped: '/lambodhara_timestamped.json'
            };
        }
        // Default to Mathe Malayadwaja
        return {
            json: '/Mathe%20Malayadwaja.json',
            audio: '/Mathe%20Malayadwaja.mp3',
            timestamped: '/Mathe%20Malayadwaja_timestamped.json'
        };
    }, [songId]);

    const toggleDrone = useCallback(async () => {
        if (droneActive) {
            stopDrone();
            setDroneActive(false);
        } else {
            await startDrone(tonicHz);
            setDroneActive(true);
        }
    }, [droneActive, tonicHz]);

    // Handle tonicHz (Shruti) changes dynamically for drone
    useEffect(() => {
        if (droneActive) {
            stopDrone();
            startDrone(tonicHz);
        }
    }, [tonicHz, droneActive]);

    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { tonicHzRef.current = tonicHz; }, [tonicHz]);

    useEffect(() => {
        setIsLoaded(false);
        // Clear old data to prevent "leakage" while new song loads
        tokensRef.current = [];
        noteCountRef.current = 0;
        timestampedSahityaRef.current = [];

        fetch(songAssets.json)
            .then(r => r.json())
            .then(data => {
                const { tokens, noteCount } = parseSongJson(data);
                tokensRef.current = tokens;
                noteCountRef.current = noteCount;
                setSectionName('Pallavi');
                lastSectionRef.current = 'Pallavi';
            })
            .catch(console.error);

        // Fetch timestamped Sahitya for karaoke-style highlights & translations
        fetch(songAssets.timestamped)
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                timestampedSahityaRef.current = data;
            })
            .catch(() => { timestampedSahityaRef.current = []; });
    }, [songAssets.json, songAssets.timestamped]);

    // ── 2. Load audio + decode waveform ──────────────────────────────────────
    useEffect(() => {
        // Clear old waveform
        waveformRef.current = null;
        durationRef.current = 0;
        currentTimeRef.current = 0;

        const audio = new Audio(songAssets.audio);
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            durationRef.current = audio.duration;
        });

        audio.addEventListener('ended', () => {
            audio.currentTime = 0;
            currentTimeRef.current = 0;
            setIsPlaying(false);
        });

        // Decode raw PCM → high-res RMS envelope for continuous waveform shape
        fetch(songAssets.audio)
            .then(r => r.arrayBuffer())
            .then(buf => {
                const actx = new (window.AudioContext || window.webkitAudioContext)();
                return actx.decodeAudioData(buf).finally(() => actx.close());
            })
            .then(audioBuffer => {
                const channelData = audioBuffer.getChannelData(0);
                // ~60 points per second → smooth per-pixel waveform rendering
                const N = Math.round(audioBuffer.duration * 60);
                const step = Math.floor(channelData.length / N);
                const wf = new Float32Array(N);
                for (let i = 0; i < N; i++) {
                    let sum = 0;
                    const s = i * step;
                    const e = Math.min(s + step, channelData.length);
                    for (let j = s; j < e; j++) sum += channelData[j] * channelData[j];
                    wf[i] = Math.sqrt(sum / (e - s));
                }
                waveformRef.current = wf;
                setIsLoaded(true);
            })
            .catch(() => setIsLoaded(true));

        return () => {
            audio.pause();
            audio.src = '';
            setIsPlaying(false);
        };
    }, [songAssets.audio]);

    // ── 3. Mic lifecycle ──────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        startMic()
            .then(({ sampleRate }) => {
                if (!cancelled) {
                    initPitchDetector(sampleRate);
                    setMicActive(true);
                }
            })
            .catch(() => { /* mic unavailable — pitch lane shows idle */ });
        return () => {
            cancelled = true;
            stopMic();
            setMicActive(false);
        };
    }, []);

    // ── 4. Play / Pause ───────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !isLoaded) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().catch(console.error);
            setIsPlaying(true);
        }
    }, [isPlaying, isLoaded]);

    // ── 4. Mouse handlers for seekbar + canvas drag-to-seek ──────────────────
    const handleMouseDown = useCallback((e) => {
        const sb = seekbarRef.current;
        const canvas = canvasRef.current;
        if (!canvas || !sb) return;
        const rect = canvas.getBoundingClientRect();
        const clickY = e.clientY - rect.top;

        if (clickY >= sb.y && clickY <= sb.y + sb.h) {
            // Seekbar click → immediate seek
            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const audio = audioRef.current;
            if (audio && durationRef.current) {
                audio.currentTime = frac * durationRef.current;
                currentTimeRef.current = audio.currentTime;
            }
            return;
        }

        // Begin canvas drag
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartTimeRef.current = currentTimeRef.current;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - dragStartXRef.current;
        const duration = durationRef.current;
        const noteCount = noteCountRef.current;
        if (!duration || !noteCount) return;
        const msPerTok = (duration * 1000) / noteCount;
        const pxPerMs = TILE_W / msPerTok;
        // dragging left → go back in time
        const newTime = Math.max(0, Math.min(duration,
            dragStartTimeRef.current - deltaX / pxPerMs / 1000));
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = newTime;
            currentTimeRef.current = newTime;
        }
    }, []);

    const handleMouseUp = useCallback((e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grab';
    }, []);

    // ── 5. Canvas animation loop ──────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        function draw() {
            const perfNow = performance.now();

            // ── Mic pitch detection (throttled to ~20 Hz) ─────────────────────
            if (perfNow - lastPitchMsRef.current > 50) {
                lastPitchMsRef.current = perfNow;
                const buf = getAudioBuffer();
                if (buf) {
                    const hz = detectPitch(buf);
                    const trail = pitchTrailRef.current;
                    trail.push({ t: perfNow, hz });

                    if (hz) {
                        const swaraInfo = hzToSwara(hz, tonicHzRef.current);
                        if (swaraInfo) {
                            setCurrentSwara({
                                ...swaraInfo,
                                hz: hz,
                                deviation: Math.round(swaraInfo.deviation)
                            });
                        }
                    } else {
                        setCurrentSwara(null);
                    }

                    // Keep last 12 seconds
                    while (trail.length > 1 && trail[0].t < perfNow - 12000) trail.shift();
                }
            }

            // Sync current time from audio element
            const audio = audioRef.current;
            if (audio) currentTimeRef.current = audio.currentTime;

            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const W = rect.width;
            const H = rect.height;
            const dark = themeRef.current !== 'light';

            const tokens = tokensRef.current;
            const noteCount = noteCountRef.current;
            const waveform = waveformRef.current;
            const duration = durationRef.current;
            const nowSec = currentTimeRef.current;

            // ── Layout ────────────────────────────────────────────────────────
            const SEEK_H = 6;
            const MAIN_H = H - SEEK_H;

            // Re-balanced sections
            const WAVE_H = Math.floor(MAIN_H * 0.35);      // Larger wave (35%)
            const SW_H = Math.floor(MAIN_H * 0.15);      // Compact swara (15%)
            const SAH_H = Math.floor(MAIN_H * 0.15);      // Compact sahitya (15%)
            const MEAN_H = Math.floor(MAIN_H * 0.15);      // Meaning lane (15%)
            const SENT_H = MAIN_H - WAVE_H - SW_H - SAH_H - MEAN_H; // Sentence lane (remaining 20%)

            const waveY = 0;
            const swY = WAVE_H;
            const sahY = WAVE_H + SW_H;
            const meanY = WAVE_H + SW_H + SAH_H;
            const sentY = WAVE_H + SW_H + SAH_H + MEAN_H;
            const seekY = MAIN_H;

            const swMidY = swY + SW_H / 2;
            const sahMidY = sahY + SAH_H / 2;
            const meanMidY = meanY + MEAN_H / 2;
            const sentMidY = sentY + SENT_H / 2;

            const PILL_H = Math.min(SW_H - 10, 32);
            const phX = W * PLAYHEAD_RATIO;

            seekbarRef.current = { y: seekY, h: SEEK_H };

            // ── Timing ────────────────────────────────────────────────────────
            // ms per akshara = total audio duration / total note tokens
            const msPerTok = (duration > 0 && noteCount > 0)
                ? (duration * 1000) / noteCount
                : 400;
            const pxPerMs = TILE_W / msPerTok;
            const scrollPx = nowSec * 1000 * pxPerMs;

            // Helper: note index → canvas x position
            const noteX = (ni) => ni * TILE_W - scrollPx + phX;

            // ── Background ────────────────────────────────────────────────────
            ctx.fillStyle = dark ? '#080810' : '#f1f5f9';
            ctx.fillRect(0, 0, W, H);

            // ── Lane shading (wave + text bands; pitch gets own bg) ──────────
            const laneAlpha = dark ? 0.05 : 0.04;
            ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${laneAlpha})`;
            ctx.fillRect(0, waveY, W, WAVE_H);
            ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${laneAlpha * 1.5})`;
            ctx.fillRect(0, swY, W, SW_H);
            ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${laneAlpha})`;
            ctx.fillRect(0, sahY, W, SAH_H);
            ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${laneAlpha * 0.5})`;
            ctx.fillRect(0, meanY, W, MEAN_H);
            ctx.fillStyle = `rgba(${dark ? '255,255,255' : '0,0,0'},${laneAlpha})`;
            ctx.fillRect(0, sentY, W, SENT_H);

            // Lane dividers (drawn behind sidebar clip)
            ctx.save();
            ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
            ctx.fillRect(SIDEBAR_W, swY - 1, W - SIDEBAR_W, 1);
            ctx.fillRect(SIDEBAR_W, sahY - 1, W - SIDEBAR_W, 1);
            ctx.fillRect(SIDEBAR_W, meanY - 1, W - SIDEBAR_W, 1);
            ctx.fillRect(SIDEBAR_W, sentY - 1, W - SIDEBAR_W, 1);
            ctx.restore();

            // ── CLIP CONTENT TO RIGHT OF SIDEBAR ──────────────────────────────
            ctx.save();
            ctx.beginPath();
            ctx.rect(SIDEBAR_W, 0, W - SIDEBAR_W, MAIN_H);
            ctx.clip();

            // ── WAVEFORM LANE — continuous filled shape ───────────────────────
            if (waveform && waveform.length > 0 && duration > 0) {
                const midY = waveY + WAVE_H / 2;
                const maxAmp = (WAVE_H - 8) / 2;

                // For each screen pixel, compute audio time → waveform amplitude
                // audioTime(x) = nowSec + (x - phX) / (pxPerMs * 1000)
                const getAmp = (x) => {
                    const t = nowSec + (x - phX) / (pxPerMs * 1000);
                    if (t < 0 || t > duration) return 0;
                    const idx = Math.min(waveform.length - 1,
                        Math.floor(t / duration * waveform.length));
                    return waveform[idx];
                };

                // Build filled waveform path (top half forward, bottom half backward)
                ctx.beginPath();
                ctx.moveTo(0, midY);
                for (let x = 0; x <= W; x++) {
                    ctx.lineTo(x, midY - getAmp(x) * maxAmp);
                }
                for (let x = W; x >= 0; x--) {
                    ctx.lineTo(x, midY + getAmp(x) * maxAmp);
                }
                ctx.closePath();

                // Gradient: past=emerald, future=indigo, split at playhead
                const ph = phX / W;
                const fillGrd = ctx.createLinearGradient(0, 0, W, 0);
                fillGrd.addColorStop(0, hexRgba('#10b981', 0.55));
                fillGrd.addColorStop(Math.max(0, ph - 0.002), hexRgba('#10b981', 0.55));
                fillGrd.addColorStop(ph, hexRgba('#34d399', 0.9));
                fillGrd.addColorStop(Math.min(1, ph + 0.002), hexRgba('#818cf8', 0.45));
                fillGrd.addColorStop(1, hexRgba('#818cf8', 0.22));
                ctx.fillStyle = fillGrd;
                ctx.fill();

                // Thin bright stroke along the top edge only (the "spine")
                ctx.beginPath();
                ctx.moveTo(0, midY - getAmp(0) * maxAmp);
                for (let x = 1; x <= W; x++) {
                    ctx.lineTo(x, midY - getAmp(x) * maxAmp);
                }
                const strokeGrd = ctx.createLinearGradient(0, 0, W, 0);
                strokeGrd.addColorStop(0, hexRgba('#10b981', 0.6));
                strokeGrd.addColorStop(ph, hexRgba('#34d399', 1.0));
                strokeGrd.addColorStop(1, hexRgba('#818cf8', 0.4));
                ctx.strokeStyle = strokeGrd;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.restore(); // end clip for wave

            // Thin playhead tick on waveform lane (just a 1px bright line)
            ctx.save();
            ctx.strokeStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(phX, waveY + 2);
            ctx.lineTo(phX, waveY + WAVE_H - 2);
            ctx.stroke();
            ctx.restore();

            // ── KARAOKE LANES: SWARAM + SAHITYAM ─────────────────────────────
            // Karaoke aesthetic: flowing text, current syllable glows,
            // past is dimmed, future is neutral. No filled box tiles.

            // For updating the header section name
            let activeSectionName = '';

            // ── Draw section labels (scroll with content) ─────────────────────
            for (const tok of tokens) {
                if (tok.type !== 'section_start') continue;
                const sx = noteX(tok.noteIdxAtPoint);
                if (sx < 0 || sx > W + 80) continue;

                ctx.save();
                // Small pill badge for the section name
                const label = tok.section;
                ctx.font = 'bold 11px Inter';
                const tw = ctx.measureText(label).width;
                const pillX = sx + 4;
                const pillY = swY + 4;
                const pillW = tw + 16;
                const pillH = 20;
                ctx.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                roundRect(ctx, pillX, pillY, pillW, pillH, 5);
                ctx.fill();
                ctx.fillStyle = dark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.45)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, pillX + 8, pillY + pillH / 2);
                ctx.restore();
            }

            // ── Draw bar lines ────────────────────────────────────────────────
            // | = anga boundary (beat group), || = avartana end (full tala cycle)
            for (const tok of tokens) {
                if (tok.type !== 'barline') continue;
                const bx = noteX(tok.noteIdxAtPoint);
                if (bx < 0 || bx > W + 2) continue;
                ctx.save();
                const barTop = swY + 4;
                const barBottom = sahY + SAH_H - 4;
                if (tok.double) {
                    // Avartana end (||): bold amber double line + small label
                    ctx.strokeStyle = dark ? 'rgba(251,191,36,0.9)' : 'rgba(180,110,0,0.8)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(bx - 2.5, barTop);
                    ctx.lineTo(bx - 2.5, barBottom);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(bx + 2.5, barTop);
                    ctx.lineTo(bx + 2.5, barBottom);
                    ctx.stroke();
                    // "||" micro-label at top
                    ctx.fillStyle = dark ? 'rgba(251,191,36,0.75)' : 'rgba(180,110,0,0.65)';
                    ctx.font = 'bold 8px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('||', bx, barTop - 1);
                } else {
                    // Anga (|): clean solid line
                    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.28)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(bx, barTop);
                    ctx.lineTo(bx, barBottom);
                    ctx.stroke();
                    // "|" micro-label at top
                    ctx.fillStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.22)';
                    ctx.font = 'bold 8px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('|', bx, barTop - 1);
                }
                ctx.restore();
            }

            // ── Karaoke glow: draw a soft vertical sweep at playhead ──────────
            {
                const glowW = TILE_W * 1.5;
                const glowGrd = ctx.createLinearGradient(phX - glowW, 0, phX + glowW * 0.5, 0);
                glowGrd.addColorStop(0, 'rgba(255,255,255,0)');
                glowGrd.addColorStop(0.6, dark ? 'rgba(255,255,255,0.04)' : 'rgba(120,80,255,0.04)');
                glowGrd.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = glowGrd;
                ctx.fillRect(phX - glowW, swY, glowW * 1.5, SW_H + SAH_H + MEAN_H + SENT_H);
            }

            // ── Draw swaram + sahityam text tokens ────────────────────────────
            for (const tok of tokens) {
                if (tok.type !== 'note' && tok.type !== 'rest') continue;

                const ni = tok.noteIdx;
                const tx = noteX(ni);            // left edge of this token's slot
                const cx = tx + TILE_W / 2;      // center x of slot

                if (tx < -TILE_W * 3 || tx > W + TILE_W * 2) continue;

                const isAt = tx <= phX && tx + TILE_W > phX;
                const isPast = tx + TILE_W <= phX;
                const base = tok.color;

                if (isAt) activeSectionName = tok.section;

                // ── SWARAM lane ───────────────────────────────────────────────
                const swLabel = tok.type === 'rest' ? '·' : (tok.swaram ?? '');

                if (isAt) {
                    // Glow pill behind current swaram
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = base;
                    ctx.fillStyle = hexRgba(base, 0.2);
                    const pillW = TILE_W - 6;
                    roundRect(ctx, cx - pillW / 2, swMidY - PILL_H / 2, pillW, PILL_H, PILL_H / 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }

                // Swaram text — 24px active, 16px inactive (increased size)
                {
                    const size = isAt ? 24 : 16;
                    const weight = isAt ? '900' : isPast ? '400' : '600';
                    ctx.save();
                    ctx.font = `${weight} ${size}px Inter`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (isAt) {
                        ctx.fillStyle = base;
                        ctx.shadowBlur = 14;
                        ctx.shadowColor = base;
                    } else if (isPast) {
                        ctx.fillStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)';
                    } else {
                        ctx.fillStyle = dark ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.68)';
                    }
                    ctx.fillText(swLabel, cx, swMidY);
                    ctx.restore();
                }

                // Underline for current swaram
                if (isAt) {
                    ctx.save();
                    ctx.fillStyle = base;
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = base;
                    const ulW = TILE_W - 14;
                    ctx.fillRect(cx - ulW / 2, swMidY + 14, ulW, 2);
                    ctx.restore();
                }

                // ── SAHITYAM lane ─────────────────────────────────────────────
                const rawSah = tok.isContinuation ? '·' : (tok.sahityam ?? '');
                const sahTrimmed = rawSah.replace(/^\(.*\)$/, '').trim();
                // Capitalize first letter
                const sahLabel = sahTrimmed && sahTrimmed !== '·'
                    ? sahTrimmed.charAt(0).toUpperCase() + sahTrimmed.slice(1)
                    : sahTrimmed;

                if (isAt && sahLabel && sahLabel !== '·') {
                    // Glow pill behind current syllable
                    ctx.save();
                    ctx.shadowBlur = 18;
                    ctx.shadowColor = base;
                    ctx.fillStyle = hexRgba(base, 0.15);
                    const pillW = TILE_W - 4;
                    roundRect(ctx, cx - pillW / 2, sahMidY - PILL_H / 2, pillW, PILL_H, PILL_H / 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }

                // Sahityam text — 24px active, 16px inactive (increased size)
                {
                    const size = isAt ? 24 : 16;
                    const weight = isAt ? '800' : isPast ? '400' : '600';
                    ctx.save();
                    ctx.font = `${weight} ${size}px Inter`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    if (isAt) {
                        ctx.fillStyle = dark ? '#ffffff' : '#0f172a';
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = base;
                    } else if (isPast) {
                        ctx.fillStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)';
                    } else {
                        ctx.fillStyle = dark ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.65)';
                    }
                    ctx.fillText(sahLabel, cx, sahMidY);
                    ctx.restore();
                }

                // ── MEANING lane ──────────────────────────────────────────────
                // Find precise meaning text based on Whisper timestamps
                const ts = timestampedSahityaRef.current;
                const activeTs = ts.find(t => nowSec >= t.start && nowSec <= t.end);

                if (sahLabel && sahLabel !== '·') {
                    // Try to match current token or fallback to linear meaning
                    let meaning = activeTs?.text.toLowerCase() === sahLabel.toLowerCase() ? activeTs.meaning : "";
                    if (!meaning && isAt) meaning = "Mother"; // Default fallback for Maathe

                    const size = isAt ? 15 : 10;
                    const weight = isAt ? '600' : '400';
                    ctx.save();
                    ctx.font = `italic ${weight} ${size}px Inter`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isAt ? (dark ? '#cbd5e1' : '#475569') : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)');
                    ctx.fillText(meaning, cx, meanMidY);
                    ctx.restore();
                }
            }

            // ── SENTENCE lane ────────────────────────────────────────────────
            // Full sentence translation at the bottom
            {
                const ts = timestampedSahityaRef.current;
                const activeTs = ts.find(t => nowSec >= t.start && nowSec <= t.end);
                const fullSentence = activeTs?.full_sentence || (sectionName === 'Pallavi' ? "O Mother Gauri..." : "");

                ctx.save();
                ctx.font = '600 16px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';
                ctx.fillText(fullSentence, W / 2, sentMidY);
                ctx.restore();
            }

            // ── Playhead line across swaram + sahityam lanes ──────────────────
            ctx.save();
            ctx.strokeStyle = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(phX, swY + 4);
            ctx.lineTo(phX, sentY + SENT_H - 4);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // ── Seekbar (bottom strip) ────────────────────────────────────────
            ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            ctx.fillRect(0, seekY, W, SEEK_H);
            if (duration > 0) {
                const prog = nowSec / duration;
                // Track
                ctx.fillStyle = hexRgba('#10b981', 0.25);
                ctx.fillRect(0, seekY, W, SEEK_H);
                // Fill
                ctx.fillStyle = '#10b981';
                ctx.fillRect(0, seekY, W * prog, SEEK_H);
                // Thumb
                ctx.beginPath();
                ctx.arc(W * prog, seekY + SEEK_H / 2, SEEK_H + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#34d399';
                ctx.fill();
            }



            ctx.restore(); // end clip for tokens/karaoke content

            // ── Sidebar Background (drawn over content) ───────────────────────
            {
                ctx.save();
                // Matching header glass effect or solid
                const sidebarBg = dark ? '#0f0f1a' : '#e2e8f0';
                ctx.fillStyle = sidebarBg;
                ctx.fillRect(0, 0, SIDEBAR_W, MAIN_H);

                // Vertical divider
                ctx.fillStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                ctx.fillRect(SIDEBAR_W - 1, 0, 1, MAIN_H);

                const laneLabels = [
                    { text: 'WAVE', y: WAVE_H / 2, color: dark ? 'rgba(52,211,153,1)' : 'rgba(5,150,105,1)' },
                    { text: 'SWARA', y: swMidY, color: dark ? 'rgba(167,139,250,1)' : 'rgba(109,40,217,1)' },
                    { text: 'SAHITYA', y: sahMidY, color: dark ? 'rgba(251,191,36,1)' : 'rgba(161,98,7,1)' },
                    { text: 'MEANING', y: meanMidY, color: dark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.8)' },
                    { text: 'SENTENCE', y: sentMidY, color: dark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.8)' },
                ];

                ctx.font = 'black 12px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                laneLabels.forEach(({ text, y, color }) => {
                    ctx.fillStyle = color;
                    ctx.fillText(text, SIDEBAR_W / 2, y);
                });
                ctx.restore();
            }

            // ── Update React section name (cheap string comparison) ───────────
            if (activeSectionName && activeSectionName !== lastSectionRef.current) {
                lastSectionRef.current = activeSectionName;
                setSectionName(activeSectionName);
            }

            animRef.current = requestAnimationFrame(draw);
        }

        animRef.current = requestAnimationFrame(draw);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []); // runs once; all state accessed through refs

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">

            {/* ── Header (Premium Style) ─────────────────────────────────── */}
            <header className="practice-header flex items-center justify-between px-6 py-4 bg-[var(--bg-card)]/30 backdrop-blur-xl border-b border-[var(--glass-border)] z-20 flex-shrink-0">
                {/* Left: Back + Branding */}
                <div className="flex-1 flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 flex items-center justify-center rounded-xl themed-glass text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] transition-all duration-300"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <Music2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Sangeetham</span>
                        <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-black">Practice Mode</span>
                    </div>
                </div>

                {/* Center: Pitch Intelligence */}
                <div className="flex-[2] flex items-center justify-center gap-8">
                    {/* Play/Pause Button */}
                    <button
                        onClick={togglePlay}
                        disabled={!isLoaded}
                        className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${!isLoaded
                            ? 'opacity-40 cursor-not-allowed border border-[var(--glass-border)]'
                            : isPlaying
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white text-slate-900 border border-white'
                            }`}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {!isLoaded
                            ? <Loader className="w-6 h-6 animate-spin" />
                            : isPlaying
                                ? <Pause className="w-6 h-6" />
                                : <Play className="w-6 h-6 fill-current" />
                        }
                    </button>

                    {currentSwara ? (
                        <div className="flex items-center gap-5 themed-glass px-6 py-2 rounded-2xl fade-in border border-[var(--glass-border)] bg-[var(--glass-bg)]">
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

                {/* Right: Scale & Drone */}
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
                                : 'themed-glass text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'
                                }`}
                            title="Toggle Drone"
                        >
                            {droneActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Canvas (wave + swara + sahityam) ──────────────────────── */}
            <div className="flex-1 overflow-hidden relative">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: 'grab' }}
                />
                {!isLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                        <Loader className="w-8 h-8 animate-spin text-violet-400" />
                        <p className="text-sm text-[var(--text-muted)] font-medium">Decoding audio waveform…</p>
                    </div>
                )}
            </div>
        </div>
    );
}
