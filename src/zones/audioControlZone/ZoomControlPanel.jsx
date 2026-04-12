import React from 'react';
import { Search } from 'lucide-react';

/**
 * Audio Control Zone → Zoom Slider
 * 
 * ultra-compact slider for track magnification.
 */
export default function ZoomControlPanel({ 
    waveZoom, 
    setWaveZoom, 
    borderColor 
}) {
    return (
        <div 
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border bg-white/5 backdrop-blur-md shadow-sm" 
            style={{ borderColor }}
        >
            <Search className="w-3 h-3 opacity-30" />
            <input
                type="range"
                min={Math.log(0.1)}
                max={Math.log(20)}
                step={0.01}
                value={Math.log(waveZoom)}
                onChange={e => setWaveZoom(Math.exp(Number(e.target.value)))}
                className="w-24 h-1 accent-emerald-500 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                style={{ cursor: 'pointer' }}
            />
            <span className="text-[10px] font-black tabular-nums text-emerald-500/60 min-w-[24px] text-right">
                {waveZoom >= 10 ? waveZoom.toFixed(0) : waveZoom.toFixed(1)}x
            </span>
        </div>
    );
}
