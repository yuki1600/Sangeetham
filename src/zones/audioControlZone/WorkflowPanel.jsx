import React from 'react';
import { FileText, History, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';

/**
 * Audio Control Zone → Workflow & Management (Cell 4 / Right)
 * 
 * Contains secondary actions (Lyrics, History, Save, Reset)
 * and technical metadata (Scale / Arohana-Avarohana).
 */
export default function WorkflowPanel({
    songData,
    showLyrics,
    setShowLyrics,
    showHistory,
    setShowHistory,
    handleSave,
    isSaving,
    saveStatus,
    handleResetAllEdits,
    isDark,
    borderColor
}) {

    const iconBtn = (icon, onClick, title, active = false, color = 'var(--text-muted)') => (
        <button
            onClick={onClick}
            title={title}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                active ? 'bg-white/10 text-white' : ''
            }`}
            style={{ 
                borderColor: active ? 'rgba(255,255,255,0.3)' : borderColor,
                color: active ? '#fff' : color,
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border bg-white/5" style={{ borderColor }}>
            {iconBtn(<FileText className="w-4 h-4" />, () => setShowLyrics(true), "Lyrics & Notation Editor", showLyrics, "#a78bfa")}
            {iconBtn(<History className="w-4 h-4" />, () => setShowHistory(s => !s), "Edit History", showHistory, "#10b981")}
            {iconBtn(<RefreshCw className="w-4 h-4" />, handleResetAllEdits, "Reset All Edits", false, "#ef4444")}
            
            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                title="Save Changes"
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95 ml-1"
                style={{
                    background: saveStatus === 'ok' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                    color: saveStatus ? (saveStatus === 'ok' ? '#10b981' : '#ef4444') : '#fff',
                    boxShadow: saveStatus ? 'none' : '0 4px 12px rgba(16,185,129,0.2)'
                }}
            >
                {isSaving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : saveStatus === 'ok' ? (
                    <Check className="w-4 h-4" />
                ) : saveStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                ) : (
                    <Save className="w-4 h-4" />
                )}
            </button>
        </div>
    );
}
