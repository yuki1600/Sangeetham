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
        const handleWheel = (e) => {
            const isPinch = e.ctrlKey;
            const horizontalDominant = !isPinch &&
                Math.abs(e.deltaX) > Math.abs(e.deltaY);

            // Horizontal swipe → pan
            if (horizontalDominant && onPanRef.current) {
                e.preventDefault();
                onPanRef.current(e.deltaX);
                return;
            }

            // Otherwise → zoom
            if (!onZoomChangeRef.current) return;
            // Ignore stray wheel events with no vertical component (e.g.
            // trackpad horizontal swipes when no onPan is wired up).
            if (e.deltaY === 0) return;
            e.preventDefault();
            const factor = -e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
            const next = Math.min(max, Math.max(min, zoomRef.current * factor));
            onZoomChangeRef.current(next);
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [targetRef, min, max]);
}
