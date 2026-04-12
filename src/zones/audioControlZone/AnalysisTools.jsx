import React from 'react';
import { LayoutGrid, Scissors, Gauge, Undo2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Audio Control Zone → Analysis & Timing Tools (Cell 2 Bottom)
 * 
 * Portion A of the edit tools: Sections, Trim, Calibrate, Undo.
 * Uses icons only with hover titles.
 */
export default function AnalysisTools({
    showSections,
    setShowSections,
    editorMode,
    setEditorMode,
    customAavartanaSec,
    setCustomAavartanaSec,
    sectionTimingsCount,
    isDark,
    borderColor
}) {
    const iconBtn = (icon, onClick, title, active = false, color = 'var(--text-muted)') => (
        <button
            onClick={onClick}
            title={title}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                active ? 'bg-white/10 text-white shadow-lg' : ''
            }`}
            style={{ 
                borderColor: active ? 'rgba(255,255,255,0.4)' : borderColor,
                color: active ? '#fff' : color,
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border bg-white/5" style={{ borderColor }}>
            {/* Sections */}
            <div className="relative">
                {iconBtn(
                    <LayoutGrid className="w-4 h-4" />, 
                    () => setShowSections(s => !s), 
                    "Set Section Start Times", 
                    showSections, 
                    "#fbbf24"
                )}
                {sectionTimingsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[9px] font-black text-white shadow-lg">
                        {sectionTimingsCount}
                    </span>
                )}
            </div>

            {/* Trim */}
            {iconBtn(
                <Scissors className="w-4 h-4" />, 
                () => setEditorMode(m => m === 'trim' ? 'view' : 'trim'), 
                "Toggle Trim Mode (T)", 
                editorMode === 'trim', 
                "#ef4444"
            )}

            {/* Calibrate */}
            <div className="flex items-center gap-2 pr-1 ml-1">
                {iconBtn(
                    <Gauge className="w-4 h-4" />, 
                    () => setEditorMode(m => m === 'calibrate' ? 'view' : 'calibrate'), 
                    "Calibrate Āvartana Duration (C)", 
                    editorMode === 'calibrate', 
                    "#3b82f6"
                )}
                {customAavartanaSec && (
                    <div className="flex items-center gap-1 group">
                        <div className="flex flex-col">
                            <button 
                                onClick={() => setCustomAavartanaSec(prev => Math.max(0.01, (prev || 0) + 0.01))}
                                className="p-0.5 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Increase by 10ms"
                            >
                                <ChevronUp className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => setCustomAavartanaSec(prev => Math.max(0.01, (prev || 0) - 0.01))}
                                className="p-0.5 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Decrease by 10ms"
                            >
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex items-center">
                            <input
                                key={customAavartanaSec}
                                type="text"
                                defaultValue={customAavartanaSec.toFixed(2)}
                                onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0) setCustomAavartanaSec(val);
                                    else e.target.value = customAavartanaSec.toFixed(2);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                className="w-14 bg-transparent text-[11px] font-black tabular-nums text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 transition-all text-center"
                            />
                            <span className="text-[10px] font-black text-blue-400/40 ml-0.5">s</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
