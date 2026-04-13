import { Music, FileText, History, Save, RefreshCw, Check, AlertCircle, ExternalLink, Send, Clock, Globe } from 'lucide-react';
import { apiUrl } from '../../utils/api';

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
    handlePublishRequest,
    canEdit = true,
    isDark,
    borderColor
}) {
    const iconBtn = (icon, onClick, title, active = false, color = 'var(--text-muted)', disabled = false) => (
        <button
            onClick={disabled ? undefined : onClick}
            title={disabled ? "Login as Editor to use this tool" : title}
            disabled={disabled}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                disabled ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
            } ${
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
            {iconBtn(<Music className="w-4 h-4" />, () => setShowLyrics(true), "Lyrics & Notation Editor", showLyrics, "#a78bfa", !canEdit)}
            
            {/* View PDF */}
            {songData?.meta?.pdfPath && (
                <a
                    href={apiUrl(`/api/${songData.meta.pdfPath}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View PDF Notation"
                    className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95"
                    style={{ borderColor, color: '#f97316', background: 'transparent' }}
                >
                    <div className="relative">
                        <FileText className="w-4 h-4" />
                        <ExternalLink className="absolute -top-1 -right-1.5 w-2 h-2 opacity-60" />
                    </div>
                </a>
            )}

            {iconBtn(<History className="w-4 h-4" />, () => setShowHistory(s => !s), "Edit History", showHistory, "#10b981", !canEdit)}
            {iconBtn(<RefreshCw className="w-4 h-4" />, handleResetAllEdits, "Reset All Edits", false, "#ef4444", !canEdit)}
            
            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving || !canEdit}
                title={canEdit ? "Save Changes" : "Login as Editor to save changes"}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 ${!canEdit ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ml-1`}
                style={{
                    background: !canEdit ? 'rgba(255,255,255,0.05)' : (saveStatus === 'ok' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#10b981,#059669)'),
                    color: !canEdit ? 'var(--text-muted)' : (saveStatus ? (saveStatus === 'ok' ? '#10b981' : '#ef4444') : '#fff'),
                    boxShadow: (saveStatus || !canEdit) ? 'none' : '0 4px 12px rgba(16,185,129,0.2)',
                    border: !canEdit ? `1px solid ${borderColor}` : 'none'
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

            {/* Request Publish Button */}
            {canEdit && (
                <button
                    onClick={songData?.meta?.publishStatus === 'draft' ? handlePublishRequest : undefined}
                    disabled={songData?.meta?.publishStatus !== 'draft'}
                    title={
                        songData?.meta?.publishStatus === 'published' ? "Song is published" :
                        songData?.meta?.publishStatus === 'pending' ? "Publish request pending" :
                        "Request to publish this song"
                    }
                    className={`h-10 px-3 flex items-center justify-center rounded-xl transition-all ml-1 ${
                        songData?.meta?.publishStatus === 'draft' ? 'hover:scale-105 active:scale-95 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20' :
                        songData?.meta?.publishStatus === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 opacity-80 cursor-not-allowed' :
                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 opacity-80 cursor-default'
                    }`}
                >
                    {songData?.meta?.publishStatus === 'published' ? <Globe className="w-4 h-4" /> :
                     songData?.meta?.publishStatus === 'pending' ? <Clock className="w-4 h-4" /> :
                     <Send className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
}
