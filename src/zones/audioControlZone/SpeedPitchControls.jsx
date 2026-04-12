import React from 'react';
import { Gauge, Music } from 'lucide-react';

/**
 * Audio Control Zone → Speed & Pitch Controls (Cell 3)
 *
 * Implements tempo (playbackRate) and pitch shifting sliders.
 */
export default function SpeedPitchControls({
    speed = 1,
    setSpeed,
    pitch = 0,
    setPitch,
    isDark,
    borderColor
}) {
    return (
        <div className="flex flex-col gap-3 p-3 rounded-2xl border" 
             style={{ 
                 background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
                 borderColor 
             }}>
            {/* Speed / Tempo */}
            <div className="flex items-center gap-3">
                <Gauge className="w-4 h-4 opacity-40" />
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                        <span>Speed</span>
                        <span>{speed.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 accent-emerald-500 cursor-pointer"
                    />
                </div>
            </div>

            {/* Pitch Shift */}
            <div className="flex items-center gap-3">
                <Music className="w-4 h-4 opacity-40" />
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                        <span>Pitch</span>
                        <span>{pitch > 0 ? '+' : ''}{pitch} st</span>
                    </div>
                    <input
                        type="range"
                        min="-6"
                        max="6"
                        step="1"
                        value={pitch}
                        onChange={(e) => setPitch(parseInt(e.target.value))}
                        className="w-full h-1 accent-blue-500 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
}
