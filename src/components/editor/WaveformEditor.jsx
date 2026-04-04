import React, { useEffect, useRef } from 'react';

const AAVARTANA_PX = 320;

/**
 * Props:
 *   audioBuffer        AudioBuffer — the *edited* buffer so the waveform
 *                      reflects current cuts/trims (no red-X overlays needed)
 *   currentTime        current playback position (in edited timeline)
 *   originalDuration   clamp for time→position mapping (pass totalDuration)
 *   editorMode         'view' | 'trim'
 *   selection          { startTime, endTime } | null  (controlled by parent)
 *   onSelectionChange  (sel | null) => void
 *   theme / playheadFraction / aavartanaSec
 */
export default function WaveformEditor({
    audioBuffer,
    currentTime,
    originalDuration,
    editorMode = 'view',
    selection,
    onSelectionChange,
    sectionMarkers,   // [{ section, time }] — cyan cue lines on waveform
    theme,
    playheadFraction = 0.25,
    aavartanaSec = 3.3,
    timeRef
}) {
    const canvasRef = useRef(null);
    const samplesRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(currentTime);
    const aavartanaSecRef = useRef(aavartanaSec);
    const originalDurationRef = useRef(originalDuration);
    const selectionRef = useRef(selection);
    const sectionMarkersRef = useRef(sectionMarkers);
    const isDraggingRef = useRef(false);
    const containerRef = useRef(null);
    const editorModeRef = useRef(editorMode);

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { aavartanaSecRef.current = aavartanaSec; }, [aavartanaSec]);
    useEffect(() => { originalDurationRef.current = originalDuration; }, [originalDuration]);
    useEffect(() => { selectionRef.current = selection; }, [selection]);
    useEffect(() => { sectionMarkersRef.current = sectionMarkers; }, [sectionMarkers]);
    useEffect(() => { editorModeRef.current = editorMode; }, [editorMode]);

    const isDark = theme !== 'light';

    // Decode audioBuffer to downsampled waveform samples
    useEffect(() => {
        if (!audioBuffer) return;
        const raw = audioBuffer.getChannelData(0);
        const TARGET = 2000;
        const step = Math.max(1, Math.floor(raw.length / TARGET));
        const samples = new Float32Array(TARGET);
        for (let i = 0; i < TARGET; i++) {
            let max = 0;
            for (let j = 0; j < step; j++) {
                const v = Math.abs(raw[i * step + j] || 0);
                if (v > max) max = v;
            }
            samples[i] = max;
        }
        samplesRef.current = { samples, duration: audioBuffer.duration };
    }, [audioBuffer]);

    // Canvas draw loop
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
            const t = timeRef ? timeRef.current : currentTimeRef.current;
            const avSec = aavartanaSecRef.current;
            const playheadX = W * playheadFraction;
            const visibleSec = W / (AAVARTANA_PX / avSec);
            const timeToX = (origT) => playheadX + (origT - t) / visibleSec * W;

            if (!data || data.duration === 0) {
                ctx.fillStyle = 'rgba(16,185,129,0.2)';
                for (let i = 0; i < 60; i++) {
                    const h = H * 0.2 + Math.random() * H * 0.4;
                    ctx.fillRect(i * (W / 60), (H - h) / 2, W / 60 - 1, h);
                }
                animRef.current = requestAnimationFrame(draw);
                return;
            }

            // Waveform bars — from the edited buffer, gaps are already gone
            for (let i = 0; i < data.samples.length; i++) {
                const sampleTime = (i / data.samples.length) * data.duration;
                const x = timeToX(sampleTime);
                if (x < -2 || x > W + 2) continue;
                const amp = data.samples[i];
                const barH = Math.max(2, amp * H * 0.85);
                ctx.fillStyle = `rgba(16,185,129,${x < playheadX ? 0.35 : 0.75})`;
                ctx.fillRect(x - 1, (H - barH) / 2, 2, barH);
            }

            // Section marker lines
            for (const { section, time } of (sectionMarkersRef.current || [])) {
                const mx = timeToX(time);
                if (mx >= -1 && mx <= W + 1) {
                    ctx.save();
                    // Glow behind the line
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 6;
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
                    ctx.shadowBlur = 0;
                    // Label pill
                    ctx.font = 'bold 10px system-ui,sans-serif';
                    ctx.textAlign = 'left';
                    const labelX = Math.min(mx, W - 70);
                    const labelText = section.toUpperCase();
                    const tw = ctx.measureText(labelText).width;
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.roundRect(labelX, 3, tw + 12, 16, 3);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.fillText(labelText, labelX + 6, 15);
                    ctx.restore();
                }
            }

            // Overlay: active selection (red for trim, blue for calibrate)
            const sel = selectionRef.current;
            if (sel && sel.endTime !== null) {
                const ds = Math.min(sel.startTime, sel.endTime);
                const de = Math.max(sel.startTime, sel.endTime);
                const dx1 = timeToX(ds);
                const dx2 = timeToX(de);
                if (dx2 > 0 && dx1 < W) {
                    const isCal = editorModeRef.current === 'calibrate';
                    ctx.fillStyle = isCal ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.25)';
                    ctx.fillRect(dx1, 0, dx2 - dx1, H);
                    ctx.strokeStyle = isCal ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(dx1, 0, dx2 - dx1, H);
                    // Duration label on the selection
                    if (isCal) {
                        const durLabel = `${(de - ds).toFixed(2)}s`;
                        ctx.font = 'bold 11px system-ui,sans-serif';
                        ctx.textAlign = 'center';
                        const cx = (dx1 + dx2) / 2;
                        const tw = ctx.measureText(durLabel).width;
                        ctx.fillStyle = 'rgba(59,130,246,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(cx - tw / 2 - 6, H / 2 - 10, tw + 12, 20, 4);
                        ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.fillText(durLabel, cx, H / 2 + 4);
                    }
                }
            }

            animRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [playheadFraction]);

    const containerXToTime = (clientX) => {
        const container = containerRef.current;
        if (!container) return 0;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const W = rect.width;
        const avSec = aavartanaSecRef.current;
        const playheadX = W * playheadFraction;
        const visibleSec = W / (AAVARTANA_PX / avSec);
        const dur = originalDurationRef.current || 1;
        return Math.max(0, Math.min(dur, currentTimeRef.current + (x - playheadX) / W * visibleSec));
    };

    const handleMouseDown = (e) => {
        if (editorMode !== 'trim' && editorMode !== 'calibrate') return;
        e.stopPropagation();
        isDraggingRef.current = true;
        const t = containerXToTime(e.clientX);
        onSelectionChange({ startTime: t, endTime: t });
    };

    const handleMouseMove = (e) => {
        if ((editorMode !== 'trim' && editorMode !== 'calibrate') || !isDraggingRef.current) return;
        const t = containerXToTime(e.clientX);
        onSelectionChange(prev => prev ? { ...prev, endTime: t } : null);
    };

    const handleMouseUp = (e) => {
        if (editorMode !== 'trim' && editorMode !== 'calibrate') return;
        e.stopPropagation();
        isDraggingRef.current = false;
        const sel = selectionRef.current;
        if (!sel || Math.abs((sel.endTime ?? sel.startTime) - sel.startTime) < 0.1) {
            onSelectionChange(null);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full"
            style={{ userSelect: 'none', cursor: (editorMode === 'trim' || editorMode === 'calibrate') ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
}
