import React, { useRef } from 'react';

/**
 * TrackResizeHandle — thin draggable strip on the bottom edge of a track that
 * lets the user resize its vertical height. Lives in the Song Track Zone.
 *
 * The drag updates parent state continuously via onResize so the track's
 * height tracks the cursor live. min/max heights clamp the result.
 */
export default function TrackResizeHandle({ heightPx, minHeight = 36, maxHeight = 600, onResize, isDark }) {
    const startRef = useRef(null);

    const onMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        startRef.current = { y: e.clientY, h: heightPx };

        const onMove = (ev) => {
            const dy = ev.clientY - startRef.current.y;
            const next = Math.max(minHeight, Math.min(maxHeight, startRef.current.h + dy));
            onResize(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div
            onMouseDown={onMouseDown}
            className="absolute left-0 right-0 cursor-ns-resize z-40 group"
            style={{ bottom: -3, height: 6 }}
            title="Drag to resize track"
        >
            <div
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-50 transition-opacity"
                style={{ width: 36, height: 3, background: isDark ? '#fff' : '#000' }}
            />
        </div>
    );
}
