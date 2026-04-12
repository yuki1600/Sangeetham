import React from 'react';
import { LayoutGrid, Scissors, Gauge, Undo2 } from 'lucide-react';

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
    editOpsHistory,
    handleUndoLastCut,
    sectionTimingsCount,
    isDark,
    borderColor
}) {
    const iconBtn = (icon, onClick, title, active = false, color = 'var(--text-muted)') => (
        <button
            onClick={onClick}
            title={title}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 ${
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
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
                {iconBtn(
                    <Gauge className="w-4 h-4" />, 
                    () => setEditorMode(m => m === 'calibrate' ? 'view' : 'calibrate'), 
                    "Calibrate Āvartana Duration (C)", 
                    editorMode === 'calibrate', 
                    "#3b82f6"
                )}
                {customAavartanaSec && (
                    <span className="text-[10px] font-black tabular-nums opacity-60 text-blue-400">
                        {customAavartanaSec.toFixed(2)}s
                    </span>
                )}
            </div>

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Undo */}
            <button
                onClick={handleUndoLastCut}
                disabled={editOpsHistory.length === 0}
                className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all disabled:opacity-20 hover:scale-105 active:scale-95"
                style={{ borderColor, color: 'var(--text-muted)' }}
                title="Undo Last Cut (Ctrl+Z)"
            >
                <Undo2 className="w-4 h-4" />
            </button>
        </div>
    );
}
