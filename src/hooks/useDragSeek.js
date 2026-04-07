import { useState, useCallback, useRef } from 'react';
import { PX_PER_SEC, PLAYHEAD } from '../constants/playback';

/**
 * Drag-on-notation-to-scrub (and drag-to-select-loop-region) handlers.
 *
 * Returns the spread-able event handlers for the notation surface plus the
 * `isDragging` flag (used by the parent to suppress hover effects, etc.).
 *
 * Behavior preserved from EditorSongView's original inline handlers:
 *   - 5px movement threshold separates click-seek from drag-scrub
 *   - When `isLoopEnabled` is true, dragging selects a loop region instead
 *     of scrubbing playback
 *   - Click-while-loop-active reverts to the pre-loop position and clears
 *     the loop range
 *
 * @param {object} args
 * @param {React.MutableRefObject<HTMLAudioElement>} args.audioRef
 * @param {React.MutableRefObject<number>} args.currentTimeRef
 * @param {(t:number)=>void} args.setCurrentTime
 * @param {number} args.effectiveDuration
 * @param {number} args.waveZoom
 * @param {boolean} args.isLoopEnabled
 * @param {{start:number,end:number}|null} args.loopRange
 * @param {(r:{start:number,end:number}|null)=>void} args.setLoopRange
 * @param {number|null} args.preLoopTime
 * @param {(t:number|null)=>void} args.setPreLoopTime
 */
export function useDragSeek({
    audioRef,
    currentTimeRef,
    setCurrentTime,
    effectiveDuration,
    waveZoom,
    isLoopEnabled,
    loopRange,
    setLoopRange,
    preLoopTime,
    setPreLoopTime,
}) {
    const [isDragging, setIsDragging] = useState(false);
    const dragData = useRef({ startX: 0, startTime: 0, isSelecting: false, selectionStart: 0 });

    const onMouseDown = useCallback((e) => {
        setIsDragging(true);
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;

        const isSelecting = isLoopEnabled;
        const pxPerSec = PX_PER_SEC * waveZoom;
        const startTime = currentTimeRef.current + ((clickX - playheadX) / pxPerSec);

        dragData.current = {
            startX: x,
            startTime: currentTimeRef.current,
            selectionStart: startTime,
            isSelecting,
        };

        if (isSelecting) {
            if (loopRange === null) setPreLoopTime(currentTimeRef.current);
            setLoopRange({ start: startTime, end: startTime });
        }
    }, [isLoopEnabled, loopRange, waveZoom, currentTimeRef, setLoopRange, setPreLoopTime]);

    const onMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;

        if (dragData.current.isSelecting) {
            const pxPerSec = PX_PER_SEC * waveZoom;
            const currentT = currentTimeRef.current + ((clickX - playheadX) / pxPerSec);
            const start = Math.min(dragData.current.selectionStart, currentT);
            const end = Math.max(dragData.current.selectionStart, currentT);
            setLoopRange({
                start: Math.max(0, start),
                end: Math.min(effectiveDuration, end),
            });
        } else {
            const deltaX = x - dragData.current.startX;
            const pxPerSec = PX_PER_SEC * waveZoom;
            const deltaT = -(deltaX / pxPerSec);
            const newTime = Math.max(0, Math.min(dragData.current.startTime + deltaT, effectiveDuration));
            if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            currentTimeRef.current = newTime;
        }
    }, [isDragging, effectiveDuration, waveZoom, audioRef, currentTimeRef, setCurrentTime, setLoopRange]);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        if (dragData.current.isSelecting && loopRange) {
            if (audioRef.current) audioRef.current.currentTime = loopRange.start;
            setCurrentTime(loopRange.start);
        }
    }, [loopRange, audioRef, setCurrentTime]);

    const onClick = useCallback((e) => {
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const dragStartPos = dragData.current?.startX || 0;
        const deltaX = Math.abs(x - dragStartPos);
        if (deltaX >= 5) return;

        // Click-while-loop-active reverts to pre-loop position and clears the loop
        if (isLoopEnabled && loopRange) {
            if (preLoopTime !== null) {
                if (audioRef.current && audioRef.current.readyState > 0) {
                    audioRef.current.currentTime = preLoopTime;
                }
                setCurrentTime(preLoopTime);
                currentTimeRef.current = preLoopTime;
            }
            setLoopRange(null);
            setPreLoopTime(null);
            return;
        }

        if (isLoopEnabled) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;
        const pxPerSec = PX_PER_SEC * waveZoom;
        const deltaT = (clickX - playheadX) / pxPerSec;
        const newTime = Math.max(0, Math.min(currentTimeRef.current + deltaT, effectiveDuration));
        if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        currentTimeRef.current = newTime;
    }, [effectiveDuration, isLoopEnabled, loopRange, preLoopTime, waveZoom, audioRef, currentTimeRef, setCurrentTime, setLoopRange, setPreLoopTime]);

    return {
        isDragging,
        handlers: {
            onMouseDown,
            onMouseMove,
            onMouseUp,
            onMouseLeave: onMouseUp,
            onTouchStart: onMouseDown,
            onTouchMove: onMouseMove,
            onTouchEnd: onMouseUp,
            onClick,
        },
    };
}
