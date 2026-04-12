import React from 'react';
import { Repeat, RotateCcw, Pause, Play } from 'lucide-react';

/**
 * Audio Control Zone → Transport Controls
 *
 * The playback control pill that lives below the pitch bar in the header.
 * Contents:
 *   • LoopToggleButton — toggles loop selection mode
 *   • RestartButton — returns playhead to 0
 *   • SwaraSahityaAudioToggle — picks which audio source plays
 *   • PlayPauseButton — primary play/pause action
 *
 * Pure view over props.
 */
export default function TransportControls({
    // playback
    isPlaying,
    togglePlay,
    restartAudio,
    editedBlobUrl,
    // loop
    isLoopEnabled,
    setIsLoopEnabled,
    setLoopRange,
    setPreLoopTime,
    // audio source toggle
    activeAudioType,
    setActiveAudioType,
    songData,
    setShowMissingAudioUpload,
    // theme
    isDark,
    borderColor,
}) {
    return (
        <div className="flex items-center justify-center gap-4 py-0.5">
            <div
                className="flex items-center gap-4 px-5 py-1 rounded-2xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}
            >
                <div className="flex items-center gap-3">
                    {/* Loop */}
                    <button
                        onClick={() => {
                            const targetState = !isLoopEnabled;
                            setIsLoopEnabled(targetState);
                            if (!targetState) {
                                setLoopRange(null);
                                setPreLoopTime(null);
                            }
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 border ${isLoopEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : `border-transparent opacity-40 hover:opacity-100 ${isDark ? 'text-white' : 'text-black'}`
                            }`}
                        title="Loop Mode"
                    >
                        <Repeat className="w-4 h-4" />
                    </button>

                    {/* Restart */}
                    <button
                        onClick={restartAudio}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                    >
                        <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>

                    {/* Swara/Sahitya audio source toggle */}
                    <div className="flex p-0.5 rounded-xl ml-2" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${borderColor}` }}>
                        <button
                            onClick={() => {
                                setActiveAudioType('swara');
                                if (!songData?.meta?.hasSwara) setShowMissingAudioUpload(true);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeAudioType === 'swara' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            Swara
                        </button>
                        <button
                            onClick={() => {
                                setActiveAudioType('sahitya');
                                if (!songData?.meta?.hasSahitya) setShowMissingAudioUpload(true);
                            }}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeAudioType === 'sahitya' ? 'bg-cyan-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            Sahitya
                        </button>
                    </div>

                    {/* Play / pause */}
                    <button
                        onClick={togglePlay}
                        disabled={!editedBlobUrl}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl disabled:opacity-40"
                        style={{
                            background: isPlaying ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                            border: `1px solid ${isPlaying ? 'rgba(16,185,129,0.4)' : 'transparent'}`,
                        }}
                    >
                        {isPlaying
                            ? <Pause className="w-6 h-6" style={{ color: '#10b981' }} />
                            : <Play className="w-6 h-6 fill-current text-white" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
