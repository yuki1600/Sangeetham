import React from 'react';
import { Layers, ChevronDown, Check, FileText, FileJson, FileAudio, RefreshCw, Upload } from 'lucide-react';
import { apiUrl } from '../../utils/api';

/**
 * Bottom Bar → Admin Controls
 *
 * Song-level admin actions. Per the PRD this cell holds:
 *   • Files dropdown — manage active audio source, downloads, swap files
 *   • Reset button (TODO: relocate from EditControls in a follow-up wave)
 *
 * "Admin" here means *song-level* admin, not the site-wide admin console
 * (that lives at src/admin/, Phase 7).
 *
 * Note: this component is currently mounted from EditorSongView's header
 * for visual continuity. The Bottom Bar wrapper will own it once the layout
 * grid is in place.
 */
export default function AdminControls({
    songData,
    showDownloadMenu,
    setShowDownloadMenu,
    downloadMenuRef,
    activeAudioType,
    isDownloadingAudio,
    editedBuffer,
    handleDownloadJSON,
    handleDownloadOriginalAudio,
    handleDownloadEditedMP3,
    audioSwapRef,
    jsonSwapRef,
    handleAudioSwap,
    handleJsonSwap,
    isDark,
    borderColor,
    canEdit,
}) {
    return (
        <div className="flex items-center gap-2">
            {/* Manage Files dropdown */}
            <div className="relative" ref={downloadMenuRef}>
                <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black border transition-all ${showDownloadMenu ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : ''}`}
                    style={{ borderColor: showDownloadMenu ? undefined : borderColor, color: showDownloadMenu ? undefined : (isDark ? '#fff' : '#000') }}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Files
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showDownloadMenu && (
                    <div
                        className="absolute left-0 bottom-full mb-2 rounded-xl border overflow-hidden z-50 shadow-2xl"
                        style={{ background: isDark ? '#141420' : '#fff', borderColor, minWidth: 220 }}
                    >
                        <div className="px-3 py-2 bg-emerald-500/5 border-b" style={{ borderColor }}>
                            <div className="text-[10px] uppercase tracking-widest opacity-40 font-black mb-1">Active Track</div>
                            <div className="flex flex-col gap-2">
                                <div className={`p-2 rounded-lg border flex items-center justify-between ${activeAudioType === 'swara' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-transparent opacity-60'}`}>
                                    <div className="flex flex-col min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider">Swara</div>
                                        <div className="text-[10px] truncate opacity-60">
                                            {songData.meta?.hasSwara ? (songData.meta.swaraFilename || 'Swara.mp3') : 'Not Uploaded'}
                                        </div>
                                    </div>
                                    {songData.meta?.hasSwara && activeAudioType === 'swara' && <Check className="w-3 h-3 text-emerald-500" />}
                                </div>
                                <div className={`p-2 rounded-lg border flex items-center justify-between ${activeAudioType === 'sahitya' ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-transparent opacity-60'}`}>
                                    <div className="flex flex-col min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider">Sahitya</div>
                                        <div className="text-[10px] truncate opacity-60">
                                            {songData.meta?.hasSahitya ? (songData.meta.sahityaFilename || 'Sahitya.mp3') : 'Not Uploaded'}
                                        </div>
                                    </div>
                                    {songData.meta?.hasSahitya && activeAudioType === 'sahitya' && <Check className="w-3 h-3 text-cyan-500" />}
                                </div>
                            </div>
                        </div>

                        <div className="px-3 py-2 text-[10px] uppercase tracking-widest opacity-40 font-black">Downloads</div>
                        {[
                            { label: 'View PDF Notation', icon: FileText, action: () => window.open(apiUrl(`/api/${songData.meta?.pdfPath}`), '_blank'), hidden: !songData.meta?.pdfPath, color: '#f97316' },
                            { label: 'Original JSON', icon: FileJson, action: () => handleDownloadJSON(false) },
                            { label: 'Edited JSON (Current)', icon: Check, action: () => handleDownloadJSON(true), color: '#10b981' },
                            { label: 'Original Audio (.mp3)', icon: FileAudio, action: handleDownloadOriginalAudio },
                            {
                                label: isDownloadingAudio ? 'Converting...' : 'Edited Audio (.mp3)',
                                icon: isDownloadingAudio ? RefreshCw : FileAudio,
                                action: handleDownloadEditedMP3,
                                disabled: !editedBuffer || isDownloadingAudio,
                                color: '#10b981',
                            },
                        ].filter(item => !item.hidden).map(item => (
                            <button
                                key={item.label}
                                onClick={(e) => { e.stopPropagation(); item.action(); setShowDownloadMenu(false); }}
                                disabled={item.disabled}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-emerald-500/10 disabled:opacity-40 flex items-center gap-2"
                                style={{ color: item.color }}
                            >
                                <item.icon className={`w-3.5 h-3.5 ${item.icon === RefreshCw ? 'animate-spin' : 'opacity-60'}`} />
                                {item.label}
                            </button>
                        ))}

                    {canEdit && (
                        <>
                            <div className="h-px w-full" style={{ background: borderColor }} />
                            <div className="px-3 py-2 text-[10px] uppercase tracking-widest opacity-40 font-black">Swap Files</div>

                            <button
                                onClick={() => {
                                    if (audioSwapRef.current) {
                                        audioSwapRef.current.dataset.type = 'swara';
                                        audioSwapRef.current.click();
                                    }
                                    setShowDownloadMenu(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-amber-500/10 flex items-center gap-2 text-amber-500"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Swap Swara Audio
                            </button>
                            <button
                                onClick={() => {
                                    if (audioSwapRef.current) {
                                        audioSwapRef.current.dataset.type = 'sahitya';
                                        audioSwapRef.current.click();
                                    }
                                    setShowDownloadMenu(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-amber-500/10 flex items-center gap-2 text-amber-500"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Swap Sahitya Audio
                            </button>
                            <button
                                onClick={() => { jsonSwapRef.current?.click(); setShowDownloadMenu(false); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-amber-500/10 flex items-center gap-2 text-amber-500"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Swap JSON Composition
                            </button>
                        </>
                    )}
                </div>
                )}
            </div>

            {/* Hidden swap inputs */}
            <input
                type="file"
                ref={audioSwapRef}
                className="hidden"
                accept="audio/*,.mp3"
                onChange={(e) => handleAudioSwap(e, audioSwapRef.current.dataset.type)}
            />
            <input
                type="file"
                ref={jsonSwapRef}
                className="hidden"
                accept=".json,application/json"
                onChange={handleJsonSwap}
            />
        </div>
    );
}
