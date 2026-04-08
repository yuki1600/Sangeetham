import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Default state for every track in the Song Track Zone. Heights match the
 * pre-Phase-2 hard-coded values so the layout looks identical on first load.
 *
 *   kind=audio  → uses audio.volume / audio.muted (mute/solo/volume work)
 *   kind=visual → no audio output, no Track Controls in the UI (visibility
 *                 + heightPx are the only useful state)
 */
const DEFAULT_TRACKS = {
    sound:   { kind: 'audio',  label: 'Sound Track',   muted: false, solo: false, volume: 1.0, visible: true, heightPx: 140 },
    sahitya: { kind: 'visual', label: 'Sahitya Track', visible: true, heightPx: 140 },
    swara:   { kind: 'visual', label: 'Swara Track',   visible: true, heightPx: 140 },
};

/**
 * Central track state for the Song Track Zone.
 *
 * State held here:
 *   { sound, sahitya, swara } each with { kind, label, ... }
 *
 * For the Sound Track we drive `audio.volume` and `audio.muted` directly on
 * the HTMLAudioElement — no Web Audio routing. This keeps playback on the
 * default output path (reliable across StrictMode remounts and browser
 * autoplay quirks) and is plenty for mute/solo/volume. We can revisit and
 * route through a real GainNode in Phase 4 when Instrument Tracks need a
 * shared mix bus.
 *
 * Effective output for the Sound Track:
 *   muted                       → audio.muted = true
 *   any other audio track solo  → audio.muted = true
 *   else                        → audio.volume = clamp(volume, 0, 1)
 *
 * Visual tracks (Sahitya, Swara) have no audio output — their state only
 * controls UI (visibility + heightPx).
 */
/** Default vertical order of tracks in the Song Track Zone. */
const DEFAULT_TRACK_ORDER = ['sound', 'sahitya', 'swara'];

export function useTrackMixer() {
    const [tracks, setTracks] = useState(DEFAULT_TRACKS);
    const [trackOrder, setTrackOrder] = useState(DEFAULT_TRACK_ORDER);
    const audioElRef = useRef(null);

    // EditorSongView calls this once after creating the HTMLAudioElement.
    // Stable callback (no deps) so the consumer's useEffect doesn't re-run.
    const wireSoundTrack = useCallback((audioElement) => {
        audioElRef.current = audioElement;
    }, []);

    // Apply mixer state to the audio element. Runs whenever the mixer state
    // changes OR when the audio element is re-wired (we want a freshly
    // recreated element to inherit the latest mute/volume).
    useEffect(() => {
        const audio = audioElRef.current;
        if (!audio) return;
        const anySolo = Object.values(tracks).some(t => t.kind !== 'visual' && t.solo);
        const sound = tracks.sound;
        const isMuted = sound.muted || (anySolo && !sound.solo);
        audio.muted = isMuted;
        audio.volume = Math.max(0, Math.min(1, sound.volume));
    }, [tracks]);

    const setTrackState = useCallback((id, patch) => {
        setTracks(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    }, []);

    // Move a track up (-1) or down (+1) in the visible stack by swapping it
    // with its neighbour. Edges are no-ops so the caller doesn't have to
    // guard against falling off the ends.
    const moveTrack = useCallback((id, direction) => {
        setTrackOrder(prev => {
            const idx = prev.indexOf(id);
            if (idx < 0) return prev;
            const target = idx + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = prev.slice();
            [next[idx], next[target]] = [next[target], next[idx]];
            return next;
        });
    }, []);

    return useMemo(
        () => ({ tracks, setTrackState, wireSoundTrack, trackOrder, moveTrack }),
        [tracks, setTrackState, wireSoundTrack, trackOrder, moveTrack]
    );
}
