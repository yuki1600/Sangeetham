import { useCallback, useEffect, useRef } from 'react';

/**
 * Bottom seekbar handlers — converts a mouse/touch coordinate to a time
 * fraction of the audio and supports continuous drag.
 *
 * Returns a ref to attach to the seekbar element plus pointer-down handlers
 * to spread on it. Global mousemove/touchmove listeners are installed to
 * support dragging outside the bar.
 *
 * @param {object} args
 * @param {React.MutableRefObject<HTMLAudioElement>} args.audioRef
 * @param {React.MutableRefObject<number>} args.currentTimeRef
 * @param {(t:number)=>void} args.setCurrentTime
 * @param {number} args.effectiveDuration
 */
export function useSeekBar({ audioRef, currentTimeRef, setCurrentTime, effectiveDuration }) {
    const seekBarRef = useRef(null);
    const isDraggingSeek = useRef(false);

    const seekToFrac = useCallback((clientX) => {
        if (effectiveDuration === 0 || !seekBarRef.current) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const t = frac * effectiveDuration;
        if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = t;
        setCurrentTime(t);
        currentTimeRef.current = t;
    }, [effectiveDuration, audioRef, currentTimeRef, setCurrentTime]);

    const onMouseDown = useCallback((e) => {
        isDraggingSeek.current = true;
        seekToFrac(e.clientX);
        e.preventDefault();
    }, [seekToFrac]);

    const onTouchStart = useCallback((e) => {
        isDraggingSeek.current = true;
        seekToFrac(e.touches[0].clientX);
    }, [seekToFrac]);

    useEffect(() => {
        const onMove = (e) => {
            if (!isDraggingSeek.current) return;
            seekToFrac(e.clientX ?? e.touches?.[0]?.clientX);
        };
        const onUp = () => { isDraggingSeek.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [seekToFrac]);

    return { seekBarRef, onMouseDown, onTouchStart };
}
