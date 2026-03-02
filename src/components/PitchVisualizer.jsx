import React, { useRef, useEffect } from 'react';
import { getSwaraScale, hzToSwara } from '../utils/swaraUtils';

/**
 * Real-time pitch visualization canvas.
 * Uses refs for pitch data so the rAF loop always reads fresh values.
 * Renders swara grid, target note band, scrolling user pitch trail,
 * and a prominent "snake head" with glow at the NOW line.
 */
export default function PitchVisualizer({
    tonicHz,
    pitchHistory,       // Array of { time, hz }
    fullReferencePitchCurve = null, // Array of { time, hz } representing entire audio
    isActive,
    theme = 'light',     // 'dark' | 'light'
    sequence = null,    // The predefined swara sequence (for labels)
    audioCurrentTime = 0, // Current audio time in seconds
}) {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const smoothYRef = useRef(null);
    const smoothRefYRef = useRef(null);

    // Use refs for high-frequency animation loop
    const pitchHistoryRef = useRef(pitchHistory);
    const fullCurveRef = useRef(fullReferencePitchCurve);
    const tonicHzRef = useRef(tonicHz);
    const audioTimeRef = useRef(audioCurrentTime);
    const themeRef = useRef(theme);
    const sequenceRef = useRef(sequence);

    useEffect(() => { pitchHistoryRef.current = pitchHistory; }, [pitchHistory]);
    useEffect(() => { fullCurveRef.current = fullReferencePitchCurve; }, [fullReferencePitchCurve]);
    useEffect(() => { tonicHzRef.current = tonicHz; }, [tonicHz]);
    useEffect(() => { audioTimeRef.current = audioCurrentTime; }, [audioCurrentTime]);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { sequenceRef.current = sequence; }, [sequence]);

    useEffect(() => {
        if (!isActive) return;

        function draw() {
            const canvas = canvasRef.current;
            if (!canvas) { animFrameRef.current = requestAnimationFrame(draw); return; }

            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const W = rect.width;
            const H = rect.height;
            const theme = themeRef.current;
            const tonic = tonicHzRef.current;
            const audioTimeMs = audioTimeRef.current * 1000;
            const fullCurve = fullCurveRef.current;
            const history = pitchHistoryRef.current;
            const sequence = sequenceRef.current;

            const colors = theme === 'light' ? {
                bg: '#f8fafc',
                grid: 'rgba(0,0,0,0.05)',
                swara: 'rgba(15, 23, 42, 0.4)',
                userPitch: '#10b981',
                refPitch: '#6366f1',
                playhead: 'rgba(0,0,0,0.1)'
            } : {
                bg: '#0a0a0f',
                grid: 'rgba(255, 255, 255, 0.05)',
                swara: 'rgba(255, 255, 255, 0.3)',
                userPitch: '#10b981',
                refPitch: '#818cf8',
                playhead: 'rgba(255,255,255,0.2)'
            };

            ctx.fillStyle = colors.bg;
            ctx.fillRect(0, 0, W, H);

            // Coordinate System
            const PADDING_TOP = 40;
            const PADDING_BOTTOM = 40;
            const PADDING_LEFT = 120;
            const graphH = H - PADDING_TOP - PADDING_BOTTOM;
            const playheadX = W * 0.3; // 30% from left
            const timeSpan = 10000; // 10 seconds window (Slower Scroll)

            const minCents = -100; // Sa - 1 semitone
            const maxCents = 1300; // Sa' + 1 semitone
            const centsRange = maxCents - minCents;

            const centsToY = (cents) => PADDING_TOP + graphH - ((cents - minCents) / centsRange) * graphH;
            const timeToX = (timeMs) => playheadX + ((timeMs - audioTimeMs) / timeSpan) * (W - PADDING_LEFT);

            // 1. Draw Swara Grid
            const swaras = getSwaraScale(tonic);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            swaras.forEach(s => {
                const y = centsToY(s.cents);
                if (y < PADDING_TOP || y > H - PADDING_BOTTOM) return;

                ctx.strokeStyle = colors.grid;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(PADDING_LEFT, y);
                ctx.lineTo(W, y);
                ctx.stroke();

                ctx.fillStyle = colors.swara;
                ctx.font = '600 12px Inter';
                const label = `${s.name} (${Math.round(s.hz)}Hz)`;
                ctx.fillText(label, PADDING_LEFT - 10, y);
            });

            // 2. Draw Playhead Line
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = colors.playhead;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, H);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Draw Reference Curve (The Roadmap)
            if (fullCurve && fullCurve.length > 0) {
                ctx.save();
                ctx.lineWidth = 4;
                ctx.strokeStyle = colors.refPitch + '66'; // Faded
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                let started = false;
                for (let i = 0; i < fullCurve.length; i++) {
                    const pt = fullCurve[i];
                    const x = timeToX(pt.time);
                    if (x < -50 || x > W + 50) {
                        if (started) { ctx.stroke(); started = false; }
                        continue;
                    }

                    if (!pt.hz) {
                        if (started) { ctx.stroke(); started = false; }
                        continue;
                    }

                    const info = hzToSwara(pt.hz, tonic);
                    if (!info) {
                        if (started) { ctx.stroke(); started = false; }
                        continue;
                    }
                    const y = centsToY(info.cents);

                    if (!started) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                if (started) ctx.stroke();
                ctx.restore();

                // Reference Ball at Playhead
                // Find current ref pitch
                const currentPt = fullCurve.find(p => p.time >= audioTimeMs);
                if (currentPt && currentPt.hz) {
                    const info = hzToSwara(currentPt.hz, tonic);
                    if (info) {
                        const targetY = centsToY(info.cents);
                        if (smoothRefYRef.current === null) smoothRefYRef.current = targetY;
                        else smoothRefYRef.current += (targetY - smoothRefYRef.current) * 0.2;

                        ctx.fillStyle = colors.refPitch;
                        ctx.beginPath();
                        ctx.arc(playheadX, smoothRefYRef.current, 6, 0, Math.PI * 2);
                        ctx.fill();
                        // Glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = colors.refPitch;
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                }
            }

            // 4. Draw Swara Notations from Sequence
            if (sequence && sequence.length > 0) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.font = '700 13px Inter';

                let cumulativeTimeMs = 0;
                sequence.forEach(item => {
                    const durationMs = item.duration * 1000;
                    const startTimeX = timeToX(cumulativeTimeMs);
                    const endTimeX = timeToX(cumulativeTimeMs + durationMs);
                    const centerX = (startTimeX + endTimeX) / 2;

                    // Only draw if visible
                    if (centerX > -50 && centerX < W + 50) {
                        // Find nominal Y for this swara
                        const swaraScale = getSwaraScale(tonic);
                        const swaraInfo = swaraScale.find(s => matchSwaraName(item.swara, s.name));

                        if (swaraInfo) {
                            const y = centsToY(swaraInfo.cents);

                            // Draw Label
                            ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
                            ctx.fillText(item.swara, centerX, y - 12);

                            // Vertical tick at start
                            ctx.strokeStyle = colors.grid;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(startTimeX, y - 8);
                            ctx.lineTo(startTimeX, y + 8);
                            ctx.stroke();
                        }
                    }
                    cumulativeTimeMs += durationMs;
                });
                ctx.restore();
            }

            // 5. Draw User Pitch Trail
            if (history.length > 0) {
                ctx.save();
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                let started = false;
                let lastX, lastY;

                for (let i = 0; i < history.length; i++) {
                    const pt = history[i];
                    if (!pt.hz) { started = false; continue; }

                    const x = timeToX(pt.time);
                    if (x > playheadX + 10) continue; // Future points? (should not happen for user)

                    const info = hzToSwara(pt.hz, tonic);
                    if (!info) { started = false; continue; }
                    const y = centsToY(info.cents);

                    if (!started) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        // Dynamic opacity based on "age" (distance from playhead)
                        const age = (playheadX - x) / (playheadX - PADDING_LEFT);
                        const opacity = Math.max(0, 1 - age);
                        ctx.strokeStyle = colors.userPitch + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                    }
                    lastX = x; lastY = y;
                }
                ctx.restore();

                // Snake Head
                if (lastY !== undefined && lastX > playheadX - 100) {
                    if (smoothYRef.current === null) smoothYRef.current = lastY;
                    else smoothYRef.current += (lastY - smoothYRef.current) * 0.3;

                    const headY = smoothYRef.current;
                    ctx.fillStyle = colors.userPitch;

                    // Outer Glow
                    const gradient = ctx.createRadialGradient(playheadX, headY, 0, playheadX, headY, 20);
                    gradient.addColorStop(0, colors.userPitch + '88');
                    gradient.addColorStop(1, colors.userPitch + '00');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(playheadX, headY, 20, 0, Math.PI * 2);
                    ctx.fill();

                    // Core
                    ctx.fillStyle = colors.userPitch;
                    ctx.beginPath();
                    ctx.arc(playheadX, headY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            animFrameRef.current = requestAnimationFrame(draw);
        }

        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isActive]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block"
        />
    );
}

/**
 * Match simple swara name (Sa, Ri, Ga...) to full name (Sa, Ri₁, Ri₂...).
 */
function matchSwaraName(simpleName, fullName) {
    const map = {
        'Sa': 'Sa',
        'Ri': 'Ri₂',
        'Ga': 'Ga₃',
        'Ma': 'Ma₁',
        'Pa': 'Pa',
        'Da': 'Da₂',
        'Ni': 'Ni₃',
        'Ṡa': 'Ṡa',
    };
    return map[simpleName] === fullName;
}
