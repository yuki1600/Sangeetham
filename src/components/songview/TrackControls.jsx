import React from 'react';
import { Volume2, VolumeX, Headphones } from 'lucide-react';

/**
 * TrackControls — compact horizontal control row for a single audio track
 * in the Song Track Zone. Lives below the track label inside each audible
 * track's frame.
 *
 * Contents:
 *   • Mute button   (toggles state.muted)
 *   • Solo button   (toggles state.solo)
 *   • Volume slider (sets state.volume, 0..1)
 *
 * Only rendered for tracks whose kind is audio/synth — visual-only tracks
 * (Sahitya, Swara) have no audio output and don't show this row at all.
 * Real audio routing happens in useTrackMixer.
 */
export default function TrackControls({ state, onChange, isDark }) {
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    const baseBtn = 'w-7 h-7 flex items-center justify-center rounded-md border text-[10px] font-bold transition-all hover:brightness-125 active:scale-95';

    const onMute = () => onChange({ muted: !state.muted });
    const onSolo = () => onChange({ solo: !state.solo });
    const onVol  = (e) => onChange({ volume: parseFloat(e.target.value) });

    return (
        <div
            className="pointer-events-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-lg select-none"
            style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(8px)',
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 1px 6px rgba(0,0,0,0.06)',
            }}
        >
            <button
                type="button"
                onClick={onMute}
                title={state.muted ? 'Unmute track' : 'Mute track'}
                className={baseBtn}
                style={{
                    background: state.muted ? 'rgba(239,68,68,0.85)' : 'transparent',
                    borderColor: state.muted ? 'rgba(239,68,68,0.6)' : borderColor,
                    color: state.muted ? '#fff' : (isDark ? '#fff' : '#000'),
                }}
            >
                {state.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            <button
                type="button"
                onClick={onSolo}
                title={state.solo ? 'Unsolo track' : 'Solo track'}
                className={baseBtn}
                style={{
                    background: state.solo ? 'rgba(245,158,11,0.85)' : 'transparent',
                    borderColor: state.solo ? 'rgba(245,158,11,0.6)' : borderColor,
                    color: state.solo ? '#fff' : (isDark ? '#fff' : '#000'),
                }}
            >
                <Headphones className="w-3 h-3" />
            </button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state.volume}
                onChange={onVol}
                title={`Volume ${Math.round(state.volume * 100)}%`}
                className="w-20 h-1 accent-emerald-500"
                style={{ cursor: 'pointer' }}
            />
        </div>
    );
}
