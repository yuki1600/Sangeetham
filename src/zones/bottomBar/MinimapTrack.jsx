import React, { useEffect, useRef, useCallback } from 'react';
import { extractPeaks } from '../../utils/waveformPeaks';
import { PX_PER_SEC, PLAYHEAD } from '../../constants/playback';

/**
 * Bottom Bar → Condensed Song Track
 *
 * A horizontally-compressed waveform of the entire edited audio buffer,
 * with section bands overlaid and a translucent viewport rectangle showing
 * which range is currently visible in the Sound Track. Click anywhere on
 * the strip to seek; drag the viewport rectangle to scrub.
 *
 * Reuses extractPeaks() — the same downsampler that powers WaveformEditor's
 * full waveform — but with a smaller target count since the minimap is
 * narrow.
 */
export default function MinimapTrack({
    audioBuffer,
    effectiveDuration,
    sectionRanges,
    currentTime,
    waveZoom,
    onSeek,
    isDark,
    borderColor,
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const peaksRef = useRef(null);
    const isDraggingRef = useRef(false);

    // Compute peaks once per buffer change. 600 samples is plenty for a
    // narrow strip; the canvas redraws itself on resize.
    useEffect(() => {
        peaksRef.current = audioBuffer ? extractPeaks(audioBuffer, 600) : null;
        drawCanvas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBuffer, isDark]);

    // Redraw when currentTime / sectionRanges change so the playhead and
    // section bands stay in sync. Canvas drawing is cheap at this size.
    useEffect(() => {
        drawCanvas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime, sectionRanges, effectiveDuration, waveZoom]);

    // Redraw on resize
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => drawCanvas());
        ro.observe(el);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
        ctx.fillRect(0, 0, w, h);

        // Section bands (faint, behind the waveform)
        if (sectionRanges && effectiveDuration > 0) {
            for (const range of sectionRanges) {
                const startFrac = Math.max(0, Math.min(1, range.start / effectiveDuration));
                const endFrac = Math.max(0, Math.min(1, range.end / effectiveDuration));
                const x = startFrac * w;
                const bw = Math.max(1, (endFrac - startFrac) * w);
                ctx.fillStyle = 'rgba(251,191,36,0.18)';
                ctx.fillRect(x, 0, bw, h);
            }
        }

        // Waveform peaks
        const peaks = peaksRef.current;
        if (peaks && peaks.samples.length > 0) {
            const samples = peaks.samples;
            const n = samples.length;
            const mid = h / 2;
            ctx.fillStyle = isDark ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.85)';
            for (let i = 0; i < w; i++) {
                const sIdx = Math.floor((i / w) * n);
                const v = samples[sIdx] || 0;
                const barH = Math.max(1, v * (h - 4));
                ctx.fillRect(i, mid - barH / 2, 1, barH);
            }
        }

        // Viewport indicator — a translucent rectangle showing what's
        // currently visible in the Sound Track. We can't measure the Sound
        // Track from here, so we approximate the visible window using the
        // shared waveZoom: visible_seconds ≈ w_sound / (PX_PER_SEC * waveZoom)
        // and assume the Sound Track is roughly the same on-screen width as
        // this minimap (the parent flex layout makes them comparable).
        if (effectiveDuration > 0) {
            const visibleSeconds = w / (PX_PER_SEC * waveZoom);
            const visibleStart = Math.max(0, currentTime - PLAYHEAD * visibleSeconds);
            const visibleEnd = Math.min(effectiveDuration, visibleStart + visibleSeconds);
            const x1 = (visibleStart / effectiveDuration) * w;
            const x2 = (visibleEnd / effectiveDuration) * w;
            const vw = Math.max(2, x2 - x1);
            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
            ctx.fillRect(x1, 0, vw, h);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x1 + 0.5, 0.5, vw - 1, h - 1);
        }

        // Playhead line (1px green)
        if (effectiveDuration > 0) {
            const px = (currentTime / effectiveDuration) * w;
            ctx.fillStyle = '#10b981';
            ctx.fillRect(Math.max(0, Math.min(w - 1, px)), 0, 1, h);
        }
    }, [currentTime, sectionRanges, effectiveDuration, waveZoom, isDark]);

    const seekFromEvent = (e) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frac = Math.max(0, Math.min(1, x / rect.width));
        onSeek(frac * effectiveDuration);
    };

    const onMouseDown = (e) => {
        isDraggingRef.current = true;
        seekFromEvent(e);
        const onMove = (ev) => { if (isDraggingRef.current) seekFromEvent(ev); };
        const onUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            className="relative cursor-pointer rounded-lg overflow-hidden"
            style={{
                flex: 1,
                height: 36,
                minWidth: 0,
                border: `1px solid ${borderColor}`,
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
            title="Click or drag to seek"
        >
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    );
}
