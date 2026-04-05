import React, { useEffect, useRef, useState, useCallback } from 'react';

const BASE_PX = 320; // base pixels per aavartana (no zoom)
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const RULER_H = 22; // height of time ruler in CSS px
const SCROLL_EDGE = 60; // px from edge to start auto-scrolling
const SCROLL_SPEED = 3; // seconds per second of auto-scroll at edge

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
    timeRef,
    onSeek,         // (newTime) => void — called during drag auto-scroll
    zoom = 1,
    onZoomChange    // (newZoom) => void
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

    const zoomRef = useRef(zoom);

    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { aavartanaSecRef.current = aavartanaSec; }, [aavartanaSec]);
    useEffect(() => { originalDurationRef.current = originalDuration; }, [originalDuration]);
    useEffect(() => { selectionRef.current = selection; }, [selection]);
    useEffect(() => { sectionMarkersRef.current = sectionMarkers; }, [sectionMarkers]);
    useEffect(() => { editorModeRef.current = editorMode; }, [editorMode]);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    const isDark = theme !== 'light';
    const onZoomChangeRef = useRef(onZoomChange);
    useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

    // Decode audioBuffer to downsampled waveform samples
    useEffect(() => {
        if (!audioBuffer) return;
        const raw = audioBuffer.getChannelData(0);
        const TARGET = 4000; // higher resolution for zoom
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

    // Scroll-to-zoom handler
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.15 : 1 / 1.15;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
        if (onZoomChangeRef.current) onZoomChangeRef.current(next);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    /**
     * Choose a nice ruler tick interval for the current zoom level.
     * Returns seconds between major ticks.
     */
    function pickTickInterval(pxPerSec) {
        const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];
        const minPxBetweenTicks = 60;
        for (const s of candidates) {
            if (s * pxPerSec >= minPxBetweenTicks) return s;
        }
        return 60;
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        if (m === 0) return s < 10 ? s.toFixed(1) + 's' : Math.floor(s) + 's';
        return `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
    }

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
            const z = zoomRef.current;
            const playheadX = W * playheadFraction;
            const pxPerSec = (BASE_PX * z) / avSec;
            const visibleSec = W / pxPerSec;
            const timeToX = (origT) => playheadX + (origT - t) * pxPerSec;

            // ── Time ruler ──────────────────────────────────────────────
            const rulerH = RULER_H;
            const waveTop = rulerH;
            const waveH = H - rulerH;

            // Ruler background
            ctx.fillStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(240,240,240,0.6)';
            ctx.fillRect(0, 0, W, rulerH);
            // Ruler bottom border
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, rulerH); ctx.lineTo(W, rulerH); ctx.stroke();

            const tickInterval = pickTickInterval(pxPerSec);
            const viewStartTime = t - playheadX / pxPerSec;
            const viewEndTime = viewStartTime + visibleSec;
            const firstTick = Math.floor(viewStartTime / tickInterval) * tickInterval;

            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';

            for (let tick = firstTick; tick <= viewEndTime + tickInterval; tick += tickInterval) {
                if (tick < 0) continue;
                const x = timeToX(tick);
                if (x < -20 || x > W + 20) continue;

                // Major tick line
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, rulerH - 8); ctx.lineTo(x, rulerH); ctx.stroke();

                // Label
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
                ctx.fillText(formatTime(tick), x, rulerH - 10);

                // Minor ticks (subdivide into 4)
                const minor = tickInterval / 4;
                for (let m = 1; m < 4; m++) {
                    const mx = timeToX(tick + m * minor);
                    if (mx < 0 || mx > W) continue;
                    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                    ctx.beginPath(); ctx.moveTo(mx, rulerH - 4); ctx.lineTo(mx, rulerH); ctx.stroke();
                }
            }

            // ── Waveform ────────────────────────────────────────────────
            if (!data || data.duration === 0) {
                ctx.fillStyle = 'rgba(16,185,129,0.2)';
                for (let i = 0; i < 60; i++) {
                    const h = waveH * 0.2 + Math.random() * waveH * 0.4;
                    ctx.fillRect(i * (W / 60), waveTop + (waveH - h) / 2, W / 60 - 1, h);
                }
                animRef.current = requestAnimationFrame(draw);
                return;
            }

            // Waveform bars
            for (let i = 0; i < data.samples.length; i++) {
                const sampleTime = (i / data.samples.length) * data.duration;
                const x = timeToX(sampleTime);
                if (x < -2 || x > W + 2) continue;
                const amp = data.samples[i];
                const barH = Math.max(2, amp * waveH * 0.85);
                ctx.fillStyle = `rgba(16,185,129,${x < playheadX ? 0.35 : 0.75})`;
                ctx.fillRect(x - 1, waveTop + (waveH - barH) / 2, 2, barH);
            }

            // Section marker lines
            for (const { section, time } of (sectionMarkersRef.current || [])) {
                const mx = timeToX(time);
                if (mx >= -1 && mx <= W + 1) {
                    ctx.save();
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 6;
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(mx, waveTop); ctx.lineTo(mx, H); ctx.stroke();
                    ctx.shadowBlur = 0;
                    // Label pill
                    ctx.font = 'bold 10px system-ui,sans-serif';
                    ctx.textAlign = 'left';
                    const labelX = Math.min(mx, W - 70);
                    const labelText = section.toUpperCase();
                    const tw = ctx.measureText(labelText).width;
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.roundRect(labelX, waveTop + 3, tw + 12, 16, 3);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.fillText(labelText, labelX + 6, waveTop + 15);
                    ctx.restore();
                }
            }

            // Overlay: active selection
            const sel = selectionRef.current;
            if (sel && sel.endTime !== null) {
                const ds = Math.min(sel.startTime, sel.endTime);
                const de = Math.max(sel.startTime, sel.endTime);
                const dx1 = timeToX(ds);
                const dx2 = timeToX(de);
                if (dx2 > 0 && dx1 < W) {
                    const isCal = editorModeRef.current === 'calibrate';
                    ctx.fillStyle = isCal ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.25)';
                    ctx.fillRect(dx1, waveTop, dx2 - dx1, waveH);
                    ctx.strokeStyle = isCal ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(dx1, waveTop, dx2 - dx1, waveH);
                    if (isCal) {
                        const durLabel = `${(de - ds).toFixed(2)}s`;
                        ctx.font = 'bold 11px system-ui,sans-serif';
                        ctx.textAlign = 'center';
                        const cx = (dx1 + dx2) / 2;
                        const tw = ctx.measureText(durLabel).width;
                        ctx.fillStyle = 'rgba(59,130,246,0.9)';
                        ctx.beginPath();
                        ctx.roundRect(cx - tw / 2 - 6, waveTop + waveH / 2 - 10, tw + 12, 20, 4);
                        ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.fillText(durLabel, cx, waveTop + waveH / 2 + 4);
                    }
                }
            }

            // ── Playhead line (full height including ruler) ─────────────
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, H); ctx.stroke();

            // ── Zoom level indicator (bottom-right) ─────────────────────
            if (z !== 1) {
                const label = `${z.toFixed(1)}x`;
                ctx.font = 'bold 10px system-ui,sans-serif';
                ctx.textAlign = 'right';
                const tw = ctx.measureText(label).width;
                ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
                ctx.beginPath();
                ctx.roundRect(W - tw - 16, H - 22, tw + 12, 18, 4);
                ctx.fill();
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
                ctx.fillText(label, W - 10, H - 8);
            }

            animRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [playheadFraction, isDark]);

    // ── Auto-scroll during drag ──────────────────────────────────────────────
    const autoScrollRef = useRef(null);    // interval id
    const lastClientXRef = useRef(0);      // last known mouse X
    const onSeekRef = useRef(onSeek);
    useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
        }
    }, []);

    const containerXToTime = (clientX) => {
        const container = containerRef.current;
        if (!container) return 0;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const W = rect.width;
        const avSec = aavartanaSecRef.current;
        const z = zoomRef.current;
        const playheadX = W * playheadFraction;
        const pxPerSec = (BASE_PX * z) / avSec;
        const dur = originalDurationRef.current || 1;
        return Math.max(0, Math.min(dur, currentTimeRef.current + (x - playheadX) / pxPerSec));
    };

    const startAutoScroll = useCallback(() => {
        stopAutoScroll();
        const INTERVAL_MS = 30;
        autoScrollRef.current = setInterval(() => {
            const container = containerRef.current;
            if (!container || !isDraggingRef.current) { stopAutoScroll(); return; }

            const rect = container.getBoundingClientRect();
            const x = lastClientXRef.current - rect.left;
            const W = rect.width;
            const dur = originalDurationRef.current || 1;

            let scrollDir = 0;
            let intensity = 0;
            if (x > W - SCROLL_EDGE) {
                scrollDir = 1;
                intensity = Math.min(1, (x - (W - SCROLL_EDGE)) / SCROLL_EDGE);
            } else if (x < SCROLL_EDGE) {
                scrollDir = -1;
                intensity = Math.min(1, (SCROLL_EDGE - x) / SCROLL_EDGE);
            }

            if (scrollDir === 0) return;

            const delta = scrollDir * intensity * SCROLL_SPEED * (INTERVAL_MS / 1000);
            const newTime = Math.max(0, Math.min(dur, currentTimeRef.current + delta));
            if (newTime !== currentTimeRef.current && onSeekRef.current) {
                onSeekRef.current(newTime);
                // Also update selection endpoint to follow the scroll
                const endTime = containerXToTime(lastClientXRef.current);
                onSelectionChange(prev => prev ? { ...prev, endTime } : null);
            }
        }, INTERVAL_MS);
    }, [stopAutoScroll, onSelectionChange, playheadFraction]);

    // Cleanup auto-scroll on unmount
    useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

    const handleMouseDown = (e) => {
        if (editorMode !== 'trim' && editorMode !== 'calibrate') return;
        e.stopPropagation();
        isDraggingRef.current = true;
        lastClientXRef.current = e.clientX;
        const t = containerXToTime(e.clientX);
        onSelectionChange({ startTime: t, endTime: t });
        startAutoScroll();
        // Listen on window so drag works even when mouse leaves the container
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    const handleWindowMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        lastClientXRef.current = e.clientX;
        const t = containerXToTime(e.clientX);
        onSelectionChange(prev => prev ? { ...prev, endTime: t } : null);
    }, [onSelectionChange, playheadFraction]);

    const handleWindowMouseUp = useCallback((e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        stopAutoScroll();
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        const sel = selectionRef.current;
        if (!sel || Math.abs((sel.endTime ?? sel.startTime) - sel.startTime) < 0.1) {
            onSelectionChange(null);
        }
    }, [stopAutoScroll, onSelectionChange, handleWindowMouseMove]);

    // Cleanup global listeners on unmount
    useEffect(() => () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    }, [handleWindowMouseMove, handleWindowMouseUp]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full"
            style={{ userSelect: 'none', cursor: (editorMode === 'trim' || editorMode === 'calibrate') ? 'crosshair' : 'default' }}
            onMouseDown={handleMouseDown}
        >
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
}
