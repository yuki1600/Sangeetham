import { useState, useEffect } from 'react';

/**
 * Global on/off switch for live pitch detection.
 *
 * One source of truth shared across every surface that displays pitch
 * (TonicBar on home, CompactPitchBar inside the editor, ExerciseRunner during
 * practice). Toggling it anywhere updates everywhere instantly via a tiny
 * pub/sub, and the choice is persisted to localStorage so it survives reloads.
 *
 *   const [enabled, setEnabled] = usePitchDetectionEnabled();
 *
 * Pass `enabled` straight to `usePitchDetection({ enabled })` to gate the loop.
 */
const STORAGE_KEY = 'sangeetham:pitchDetectionEnabled';
const listeners = new Set();

function loadInitial() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === null ? true : saved === 'true';
    } catch {
        return true;
    }
}

let currentValue = loadInitial();

function setGlobal(next) {
    const value = typeof next === 'function' ? next(currentValue) : !!next;
    if (value === currentValue) return;
    currentValue = value;
    try {
        localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
        // Ignore — quota / disabled storage shouldn't break the toggle.
    }
    listeners.forEach(l => l(value));
}

export function usePitchDetectionEnabled() {
    const [enabled, setLocal] = useState(currentValue);

    useEffect(() => {
        listeners.add(setLocal);
        // Sync once on mount in case the module-level value changed before
        // this component subscribed (e.g. another tab or fast remount).
        if (currentValue !== enabled) setLocal(currentValue);
        return () => listeners.delete(setLocal);
    }, []);

    return [enabled, setGlobal];
}
