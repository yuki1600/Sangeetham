import { useEffect, useRef } from 'react';

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 10;
const ZOOM_FACTOR = 1.15;

/**
 * Attach a non-passive wheel listener to `targetRef.current` that routes
 * wheel events to either zoom or pan, depending on the gesture:
 *
 *   - Pinch (ctrlKey is set — browsers synthesise this for trackpad
 *     pinches and Ctrl+wheel) → zoom via `onZoomChange`.
 *   - Horizontal-dominant wheel (|deltaX| > |deltaY|) → pan via `onPan`
 *     when supplied. This covers two-finger horizontal trackpad swipes.
 *   - Everything else (vertical mouse wheel, vertical trackpad swipe) →
 *     zoom via `onZoomChange`.
 *
 * The hook reads its callbacks from refs internally so the listener does
 * not need to be torn down on every parent render.
 *
 * @param {React.RefObject} targetRef    DOM element to attach the listener to
 * @param {number} zoom                  current zoom value (controlled by parent)
 * @param {(next:number)=>void} onZoomChange  zoom setter
 * @param {{min?:number, max?:number, onPan?:(deltaPx:number)=>void}} [opts]
 *        onPan receives the raw horizontal deltaPx; the parent is
 *        responsible for converting it into a time delta using its own
 *        pxPerSec/zoom and clamping bounds.
 */
export function useWheelZoom(targetRef, zoom, onZoomChange, opts = {}) {
    const { min = DEFAULT_MIN_ZOOM, max = DEFAULT_MAX_ZOOM, onPan } = opts;
    const zoomRef = useRef(zoom);
    const onZoomChangeRef = useRef(onZoomChange);
    const onPanRef = useRef(onPan);

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);
    useEffect(() => { onPanRef.current = onPan; }, [onPan]);

    useEffect(() => {
        const el = targetRef.current;
        if (!el) return;

        let lastTouchDist = 0;
        let lastTouchX = 0;

        const handleWheel = (e) => {
            const isPinch = e.ctrlKey;
            const dx = e.deltaX;
            const dy = e.deltaY;

            // Pinch/Zoom → perform zoom
            if (isPinch && onZoomChangeRef.current) {
                e.preventDefault();
                if (dy === 0) return;
                const factor = -dy > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
                const next = Math.min(max, Math.max(min, zoomRef.current * factor));
                onZoomChangeRef.current(next);
                return;
            }

            // Pan check: 
            // 1. Horizontal dominance (|dx| > |dy|)
            // 2. Shift + Wheel (often used for horizontal scroll)
            const isHorizontal = Math.abs(dx) > Math.abs(dy) || e.shiftKey;

            if (isHorizontal && onPanRef.current && Math.abs(dx) > 0) {
                e.preventDefault();
                onPanRef.current(dx);
                return;
            }

            // Otherwise: Normal vertical wheel → let browser scroll
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                // Prevent browser pinch-to-zoom (whole page)
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Zoom logic
                if (lastTouchDist > 0 && onZoomChangeRef.current) {
                    const ratio = dist / lastTouchDist;
                    // Apply a slightly damped ratio for smoother touch zooming
                    const sensitivity = 0.5; // dampen the zoom speed
                    const factor = 1 + (ratio - 1) * sensitivity;
                    const next = Math.min(max, Math.max(min, zoomRef.current * factor));
                    
                    if (Math.abs(ratio - 1) > 0.01) {
                        onZoomChangeRef.current(next);
                    }
                }

                // Pan logic
                if (onPanRef.current) {
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const deltaX = lastTouchX - centerX;
                    onPanRef.current(deltaX);
                    lastTouchX = centerX;
                }

                lastTouchDist = dist;
            }
        };

        const handleTouchEnd = () => {
            lastTouchDist = 0;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [targetRef, min, max]);
}
