import { useEffect, useRef } from 'react';

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 10;
const ZOOM_FACTOR = 1.15;

/**
 * Attach a non-passive wheel listener to `targetRef.current` that updates
 * `zoom` via `onZoomChange` whenever the user scrolls inside it.
 *
 * The hook reads zoom and onZoomChange from refs internally so the listener
 * does not need to be torn down on every parent render.
 *
 * @param {React.RefObject} targetRef    DOM element to attach the listener to
 * @param {number} zoom                  current zoom value (controlled by parent)
 * @param {(next:number)=>void} onZoomChange  zoom setter
 * @param {{min?:number, max?:number}} [opts]
 */
export function useWheelZoom(targetRef, zoom, onZoomChange, opts = {}) {
    const { min = DEFAULT_MIN_ZOOM, max = DEFAULT_MAX_ZOOM } = opts;
    const zoomRef = useRef(zoom);
    const onZoomChangeRef = useRef(onZoomChange);

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

    useEffect(() => {
        const el = targetRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            if (!onZoomChangeRef.current) return;
            e.preventDefault();
            const factor = -e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
            const next = Math.min(max, Math.max(min, zoomRef.current * factor));
            onZoomChangeRef.current(next);
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [targetRef, min, max]);
}
