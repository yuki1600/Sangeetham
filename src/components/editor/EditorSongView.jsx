import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    ArrowLeft, Play, Pause, RotateCcw, Save, Download,
    History, Undo2, RefreshCw, ChevronDown,
    Check, AlertCircle, Scissors, FileText
} from 'lucide-react';
import LaneLabel from '../LaneLabel';
import NotationLane from '../NotationLane';
import WaveformEditor from './WaveformEditor';
import VersionHistory from './VersionHistory';
import LyricsEditor from './LyricsEditor';
import CompactPitchBar from '../CompactPitchBar';
import { buildAavartanas, applyTokenEdit } from '../../utils/songParser';
import { applyEditOps, getEditedDuration } from '../../utils/audioEditor';
import { audioBufferToWav } from '../../utils/wavEncoder';

const AAVARTANA_PX = 320;
const PLAYHEAD = 0.25;

export default function EditorSongView({ songId, theme, tonicHz, onTonicChange, onBack }) {
    // Song data from server
    const [songData, setSongData] = useState(null);
    const [composition, setComposition] = useState(null);
    const [editOps, setEditOps] = useState({ trimStart: 0, trimEnd: null, cuts: [] });

    // Audio
    const [rawBuffer, setRawBuffer] = useState(null);       // original decoded
    const [editedBuffer, setEditedBuffer] = useState(null); // after applyEditOps
    const [editedBlobUrl, setEditedBlobUrl] = useState(null);
    const blobUrlRef = useRef(null);

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const audioRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(0);

    // Editor state
    const [editorMode, setEditorMode] = useState('view'); // 'view' | 'trim'
    const [activeSelection, setActiveSelection] = useState(null); // { startTime, endTime }
    const [editOpsHistory, setEditOpsHistory] = useState([]); // undo stack
    const [showHistory, setShowHistory] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [talam, setTalam] = useState('adi');
    const [showSections, setShowSections] = useState(false);
    const [sectionTimings, setSectionTimings] = useState({}); // { "Pallavi": 0, "Anupallavi": 45.2, ... }
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error' | null
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // applying edit ops
    const [previewBanner, setPreviewBanner] = useState(null); // { composition, editOps }

    // Drag/seek (same pattern as SongSection)
    const [isDragging, setIsDragging] = useState(false);
    const dragData = useRef({ startX: 0, startTime: 0 });

    const isDark = theme !== 'light';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    // Build aavartanas from composition
    const aavartanas = useMemo(() => composition ? buildAavartanas(composition) : [], [composition]);
    const effectiveAavartanaSec = totalDuration > 0 && aavartanas.length > 0
        ? totalDuration / aavartanas.length
        : 3.3;

    // Unique sections in order
    const uniqueSections = useMemo(
        () => [...new Set(aavartanas.map(av => av.section))],
        [aavartanas]
    );

    // Per-aavartana start times derived from sectionTimings.
    // Returns null when no timings are set (falls back to uniform spacing).
    const aavartanaTimings = useMemo(() => {
        if (!aavartanas.length || totalDuration === 0) return null;
        if (!uniqueSections.some(s => sectionTimings[s] != null)) return null;

        const timings = [];
        // cursor = natural end of the previous section.
        // For sections without a user-set timing, start right where the previous section ends.
        // This prevents the old proportional-fallback bug where a section could start
        // INSIDE the previous section's range, causing column overlap.
        let cursor = 0;

        for (const section of uniqueSections) {
            const count = aavartanas.filter(av => av.section === section).length;

            // User-marked time wins; otherwise pick up from cursor.
            const sectionStart = sectionTimings[section] ?? cursor;

            for (let i = 0; i < count; i++) {
                timings.push(sectionStart + i * effectiveAavartanaSec);
            }

            // Advance cursor. Math.max so cursor never goes backwards even when a
            // user-marked section intentionally starts earlier than the cursor.
            cursor = Math.max(cursor, sectionStart + count * effectiveAavartanaSec);
        }
        return timings;
    }, [aavartanas, uniqueSections, sectionTimings, totalDuration, effectiveAavartanaSec]);

    // Section marker objects passed to WaveformEditor for visual cue lines
    const sectionMarkers = useMemo(
        () => uniqueSections
            .filter(s => sectionTimings[s] != null)
            .map(s => ({ section: s, time: sectionTimings[s] })),
        [uniqueSections, sectionTimings]
    );

    // Current aavartana index — uses per-aavartana timings when available
    const currentAvIdx = useMemo(() => {
        if (!aavartanas.length) return 0;
        if (aavartanaTimings) {
            let idx = 0;
            for (let i = 0; i < aavartanaTimings.length; i++) {
                if (aavartanaTimings[i] <= currentTime) idx = i;
            }
            return idx;
        }
        return Math.min(
            Math.max(0, Math.floor(currentTime / effectiveAavartanaSec)),
            aavartanas.length - 1
        );
    }, [aavartanaTimings, currentTime, effectiveAavartanaSec, aavartanas.length]);

    const currentSection = aavartanas[currentAvIdx]?.section || '';

    // ── Load song data ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!songId) return;
        fetch(`/api/songs/${songId}`)
            .then(r => r.json())
            .then(data => {
                setSongData(data);
                setComposition(data.composition);
                const { sectionTimings: st, ...ops } = data.editOps || {};
                setEditOps({ trimStart: 0, trimEnd: null, cuts: [], ...ops });
                setSectionTimings(st || {});
            })
            .catch(e => console.error('Failed to load song:', e));
    }, [songId]);

    // ── Decode original audio ─────────────────────────────────────────────────
    useEffect(() => {
        if (!songId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/songs/${songId}/audio`);
                const arrayBuf = await res.arrayBuffer();
                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(arrayBuf);
                ctx.close();
                if (!cancelled) setRawBuffer(decoded);
            } catch (e) {
                console.error('Audio decode error:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [songId]);

    // ── Apply edit ops whenever rawBuffer or editOps changes ─────────────────
    useEffect(() => {
        if (!rawBuffer) return;
        let cancelled = false;
        let timeout = null;
        setIsProcessing(true);

        timeout = setTimeout(async () => {
            try {
                const edited = await applyEditOps(rawBuffer, editOps);
                if (cancelled) return;
                setEditedBuffer(edited);
            } catch (e) {
                console.error('applyEditOps error:', e);
            } finally {
                if (!cancelled) setIsProcessing(false);
            }
        }, 300);

        return () => { cancelled = true; clearTimeout(timeout); };
    }, [rawBuffer, editOps]);

    // ── Create blob URL from editedBuffer ─────────────────────────────────────
    useEffect(() => {
        if (!editedBuffer) return;
        const wav = audioBufferToWav(editedBuffer);
        const url = URL.createObjectURL(wav);
        setEditedBlobUrl(url);
        blobUrlRef.current = url;

        if (audioRef.current) {
            const prevTime = audioRef.current.currentTime;
            const wasPlaying = !audioRef.current.paused;
            audioRef.current.src = url;
            audioRef.current.load();
            audioRef.current.addEventListener('loadedmetadata', () => {
                setTotalDuration(audioRef.current.duration);
                audioRef.current.currentTime = Math.min(prevTime, audioRef.current.duration);
                if (wasPlaying) audioRef.current.play().catch(() => {});
            }, { once: true });
        }

        return () => { URL.revokeObjectURL(url); };
    }, [editedBuffer]);

    // ── Set up audio element ──────────────────────────────────────────────────
    useEffect(() => {
        const audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => setTotalDuration(audio.duration));
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, []);

    // ── RAF sync loop ─────────────────────────────────────────────────────────
    useEffect(() => {
        const tick = () => {
            if (audioRef.current) {
                const t = audioRef.current.currentTime;
                currentTimeRef.current = t;
                setCurrentTime(t);
            }
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    // ── Playback controls ─────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error('Play failed:', e));
            setIsPlaying(true);
        }
    }, [isPlaying]);

    const restartAudio = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    }, [isPlaying]);

    // ── Drag to seek ──────────────────────────────────────────────────────────
    const handleDragStart = useCallback((e) => {
        setIsDragging(true);
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        dragData.current = { startX: x, startTime: currentTimeRef.current };
    }, []);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        const deltaX = x - dragData.current.startX;
        const deltaT = -(deltaX / AAVARTANA_PX) * effectiveAavartanaSec;
        let newTime = Math.max(0, Math.min(dragData.current.startTime + deltaT, totalDuration));
        if (audioRef.current) audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [isDragging, totalDuration, effectiveAavartanaSec]);

    const handleDragEnd = useCallback(() => setIsDragging(false), []);

    const handleClickSeek = useCallback((e) => {
        const deltaX = Math.abs((e.clientX ?? 0) - dragData.current.startX);
        if (deltaX < 5) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = (e.clientX ?? 0) - rect.left;
            const playheadX = rect.width * PLAYHEAD;
            const deltaT = (clickX - playheadX) / AAVARTANA_PX * effectiveAavartanaSec;
            let newTime = Math.max(0, Math.min(currentTimeRef.current + deltaT, totalDuration));
            if (audioRef.current) audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [totalDuration, effectiveAavartanaSec]);

    const handleSeek = useCallback((e) => {
        if (!audioRef.current || totalDuration === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const t = ((e.clientX - rect.left) / rect.width) * totalDuration;
        audioRef.current.currentTime = t;
        setCurrentTime(t);
    }, [totalDuration]);

    // ── Edit ops change (with undo stack) ────────────────────────────────────
    const handleEditOpsChange = useCallback((newOps) => {
        setEditOpsHistory(prev => [...prev, editOps]);
        setEditOps(newOps);
    }, [editOps]);

    const handleUndoLastCut = useCallback(() => {
        if (editOpsHistory.length === 0) return;
        const prev = editOpsHistory[editOpsHistory.length - 1];
        setEditOpsHistory(h => h.slice(0, -1));
        setEditOps(prev);
    }, [editOpsHistory]);

    const handleResetAllEdits = useCallback(() => {
        setEditOpsHistory([]);
        setEditOps({ trimStart: 0, trimEnd: null, cuts: [] });
        setSectionTimings({});
    }, []);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (inInput) return;

            // Space: play / pause
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
                return;
            }

            // T: toggle trim mode
            if (e.key === 't' || e.key === 'T') {
                setEditorMode(m => m === 'trim' ? 'view' : 'trim');
                return;
            }

            // Ctrl+Z / Cmd+Z: undo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                handleUndoLastCut();
                return;
            }

            // R: reset all edits
            if (e.key === 'r' || e.key === 'R') {
                handleResetAllEdits();
                return;
            }

            if (editorMode !== 'trim') return;

            if (e.key === 'Escape') {
                setActiveSelection(null);
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelection?.endTime != null) {
                const start = Math.min(activeSelection.startTime, activeSelection.endTime);
                const end = Math.max(activeSelection.startTime, activeSelection.endTime);
                if (end - start < 0.1) return;
                e.preventDefault();
                setEditOpsHistory(prev => [...prev, editOps]);
                setEditOps(ops => ({ ...ops, cuts: [...(ops.cuts || []), { start, end }] }));
                setActiveSelection(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [editorMode, activeSelection, editOps, togglePlay, handleUndoLastCut, handleResetAllEdits]);

    // Clear selection when leaving trim mode
    useEffect(() => {
        if (editorMode !== 'trim') setActiveSelection(null);
    }, [editorMode]);

    // ── Token editing ─────────────────────────────────────────────────────────
    const handleTokenEdit = useCallback((avIdx, tokIdx, field, newText) => {
        if (!composition || !aavartanas[avIdx]) return;
        const newComp = applyTokenEdit(composition, aavartanas, avIdx, tokIdx, field, newText);
        setComposition(newComp);
    }, [composition, aavartanas]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!songId || !composition) return;
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const res = await fetch(`/api/songs/${songId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ composition, editOps: { ...editOps, sectionTimings } }),
            });
            if (!res.ok) throw new Error('Save failed');
            setSaveStatus('ok');
            setTimeout(() => setSaveStatus(null), 2500);
        } catch (e) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Version history restore ───────────────────────────────────────────────
    const handleRestore = useCallback((data, permanent) => {
        const { sectionTimings: st, ...ops } = data.editOps || {};
        const restoreOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
        if (permanent) {
            setComposition(data.composition);
            setEditOps(restoreOps);
            setSectionTimings(st || {});
            setPreviewBanner(null);
            setShowHistory(false);
        } else {
            setPreviewBanner(data);
            setComposition(data.composition);
            setEditOps(restoreOps);
            setSectionTimings(st || {});
        }
    }, []);

    // ── Downloads ─────────────────────────────────────────────────────────────
    const handleDownloadJSON = () => {
        if (!composition || !songData) return;
        const blob = new Blob([JSON.stringify({ song_details: songData.song_details, composition }, null, 2)], { type: 'application/json' });
        triggerDownload(blob, `${songData.meta?.title || 'song'}.json`);
    };

    const handleDownloadOriginalAudio = () => {
        if (!songId) return;
        window.open(`/api/songs/${songId}/audio`);
    };

    const handleDownloadEditedAudio = () => {
        if (!editedBuffer) return;
        const wav = audioBufferToWav(editedBuffer);
        triggerDownload(wav, `${songData?.meta?.title || 'song'}-edited.wav`);
    };

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const originalDuration = rawBuffer?.duration ?? 0;

    if (!songData) {
        return (
            <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-primary)' }}>
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* ── Header ──────────────────────────────────────────────────── */}
                <header
                    className="flex flex-col z-30 flex-shrink-0"
                    style={{
                        background: isDark ? 'rgba(10,10,15,0.9)' : 'rgba(248,250,252,0.95)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: `1px solid ${borderColor}`,
                    }}
                >
                    {/* Row 1: nav + title + actions */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={onBack}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border flex-shrink-0"
                                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                            >
                                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </button>
                            <div className="min-w-0">
                                <div className="font-bold text-sm truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {songData.meta?.title || 'Untitled'}
                                </div>
                                <div className="text-[9px] uppercase tracking-widest opacity-50">
                                    {songData.song_details?.raga} · {songData.song_details?.tala}
                                </div>
                            </div>
                        </div>

                        {/* Centered pitch bar */}
                        <div className="flex-1 flex justify-center">
                            <CompactPitchBar tonicHz={tonicHz} onTonicChange={onTonicChange} theme={theme} />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => setShowHistory(s => !s)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${showHistory ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : ''}`}
                                style={{ borderColor: showHistory ? undefined : borderColor, color: showHistory ? undefined : 'var(--text-muted)' }}
                            >
                                <History className="w-3.5 h-3.5" />
                                History
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                style={{
                                    background: saveStatus === 'ok' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                                    color: saveStatus ? (saveStatus === 'ok' ? '#10b981' : '#ef4444') : '#fff',
                                }}
                            >
                                {isSaving ? (
                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                ) : saveStatus === 'ok' ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : saveStatus === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <Save className="w-3.5 h-3.5" />
                                )}
                                {saveStatus === 'ok' ? 'Saved' : saveStatus === 'error' ? 'Failed' : 'Save'}
                            </button>

                            {/* Download dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDownloadMenu(s => !s)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                                    style={{ borderColor, color: 'var(--text-muted)' }}
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {showDownloadMenu && (
                                    <div
                                        className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden z-50"
                                        style={{ background: isDark ? '#141420' : '#fff', borderColor, minWidth: 180 }}
                                        onMouseLeave={() => setShowDownloadMenu(false)}
                                    >
                                        {[
                                            { label: 'Composition JSON', action: handleDownloadJSON },
                                            { label: 'Original Audio (.mp3)', action: handleDownloadOriginalAudio },
                                            { label: 'Edited Audio (.wav)', action: handleDownloadEditedAudio, disabled: !editedBuffer },
                                        ].map(item => (
                                            <button
                                                key={item.label}
                                                onClick={() => { item.action(); setShowDownloadMenu(false); }}
                                                disabled={item.disabled}
                                                className="w-full text-left px-4 py-2.5 text-xs font-bold transition-all hover:bg-emerald-500/10 disabled:opacity-40"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Playback controls */}
                    <div className="flex items-center justify-center gap-8 pb-4">
                        <div
                            className="flex items-center gap-6 px-8 py-2 rounded-3xl"
                            style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}
                        >
                            {/* Section badge */}
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
                                style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)' }}>
                                {currentSection || 'Pallavi'}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={restartAudio}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                                >
                                    <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                </button>

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

                            <div className="flex items-center gap-4">
                                <span className="text-sm tabular-nums font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                                    {fmt(currentTime)} / {fmt(totalDuration)}
                                </span>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                                    <span className="font-black text-sm">{currentAvIdx + 1}</span>
                                    <span className="opacity-40 text-xs">/</span>
                                    <span className="opacity-60 text-xs font-bold">{aavartanas.length}</span>
                                    <span className="text-[10px] uppercase tracking-widest opacity-40 ml-1">aavartanas</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Preview banner ───────────────────────────────────────────── */}
                {previewBanner && (
                    <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 text-xs"
                        style={{ background: 'rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.3)' }}>
                        <span style={{ color: '#fbbf24' }}>Previewing a saved version. Changes are not permanent yet.</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => {
                                setComposition(previewBanner.composition);
                                setEditOps(previewBanner.editOps || { trimStart: 0, trimEnd: null, cuts: [] });
                                setPreviewBanner(null);
                            }} className="font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                                Keep this version
                            </button>
                            <button onClick={() => {
                                // Reload current from server
                                fetch(`/api/songs/${songId}`).then(r => r.json()).then(data => {
                                    setComposition(data.composition);
                                    setEditOps(data.editOps || { trimStart: 0, trimEnd: null, cuts: [] });
                                });
                                setPreviewBanner(null);
                            }} className="opacity-60 px-2 py-1 hover:opacity-100">Discard</button>
                        </div>
                    </div>
                )}

                {/* ── Edit Toolbar ─────────────────────────────────────────────── */}
                <div
                    className="relative flex items-center justify-center gap-3 px-5 py-3 flex-shrink-0"
                    style={{ borderBottom: `1px solid ${showSections ? 'transparent' : borderColor}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}
                >
                    {/* Sections button — absolute left */}
                    <button
                        onClick={() => setShowSections(s => !s)}
                        className="absolute left-5 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all"
                        style={{
                            borderColor: showSections ? 'rgba(251,191,36,0.5)' : borderColor,
                            background: showSections ? 'rgba(251,191,36,0.1)' : 'transparent',
                            color: showSections ? '#fbbf24' : 'var(--text-muted)',
                        }}
                        title="Set section start times"
                    >
                        Sections
                        <span className="text-[10px] opacity-60 tabular-nums ml-0.5">
                            {Object.keys(sectionTimings).length > 0 ? Object.keys(sectionTimings).length : ''}
                        </span>
                    </button>

                    {/* Centred button group */}
                    <button
                        onClick={() => setEditorMode(m => m === 'trim' ? 'view' : 'trim')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                        style={{
                            borderColor: editorMode === 'trim' ? 'rgba(239,68,68,0.4)' : borderColor,
                            background: editorMode === 'trim' ? 'rgba(239,68,68,0.1)' : 'transparent',
                            color: editorMode === 'trim' ? '#ef4444' : 'var(--text-muted)',
                        }}
                        title="Toggle trim mode (T)"
                    >
                        <Scissors className="w-4 h-4" />
                        Trim
                        <kbd className="text-[9px] opacity-50 font-mono ml-0.5">T</kbd>
                    </button>

                    <div className="w-px h-6" style={{ background: borderColor }} />

                    <button
                        onClick={handleUndoLastCut}
                        disabled={editOpsHistory.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-30"
                        style={{ borderColor, color: 'var(--text-muted)' }}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 className="w-4 h-4" />
                        Undo
                        <kbd className="text-[9px] opacity-50 font-mono ml-0.5">⌘Z</kbd>
                    </button>

                    <button
                        onClick={() => setShowLyrics(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                        style={{
                            borderColor: showLyrics ? 'rgba(167,139,250,0.45)' : borderColor,
                            background: showLyrics ? 'rgba(167,139,250,0.1)' : 'transparent',
                            color: showLyrics ? '#a78bfa' : 'var(--text-muted)',
                        }}
                        title="Open lyrics & notation editor"
                    >
                        <FileText className="w-4 h-4" />
                        Lyrics
                    </button>

                    <button
                        onClick={handleResetAllEdits}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                        style={{ borderColor, color: 'var(--text-muted)' }}
                        title="Reset all edits (R)"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                        <kbd className="text-[9px] opacity-50 font-mono ml-0.5">R</kbd>
                    </button>

                    {/* Status / hint — absolute right so it doesn't shift the centred buttons */}
                    <div className="absolute right-5 flex items-center gap-2">
                        {isProcessing && (
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </div>
                        )}
                        <span className="text-[10px] opacity-40">
                            {editorMode === 'trim' && activeSelection
                                ? 'Del to remove · Esc to cancel'
                                : editorMode === 'trim'
                                ? 'Drag waveform to select'
                                : 'Use Lyrics to edit notation'}
                        </span>
                    </div>
                </div>

                {/* ── Section Timings Panel ────────────────────────────────────── */}
                {showSections && (() => {
                    const TALA_BEATS = { adi: 8, rupaka: 6, misra_chapu: 7, khanda_chapu: 5, khanda_triputa: 9, tisra_triputa: 7, chatusra_eka: 4, tisra_eka: 3, sankeerna_eka: 9 };
                    const TALA_LABELS = { adi: 'Adi', rupaka: 'Rupaka', misra_chapu: 'Misra Chapu', khanda_chapu: 'Khanda Chapu', khanda_triputa: 'Khanda Triputa', tisra_triputa: 'Tisra Triputa', chatusra_eka: 'Chatusra Eka', tisra_eka: 'Tisra Eka', sankeerna_eka: 'Sankeerna Eka' };
                    const beats = TALA_BEATS[talam] ?? 8;
                    const bpm = Math.round((beats / effectiveAavartanaSec) * 60);
                    const beatsPerSec = (beats / effectiveAavartanaSec).toFixed(2);
                    return (
                    <div style={{ borderBottom: `1px solid ${borderColor}`, background: isDark ? 'rgba(251,191,36,0.04)' : 'rgba(180,130,0,0.05)' }}>
                        {/* Tempo row */}
                        <div className="flex items-center gap-3 px-5 pt-2.5 pb-1.5 flex-shrink-0">
                            <span className="text-[10px] uppercase tracking-widest opacity-40 flex-shrink-0">Talam</span>
                            <select
                                value={talam}
                                onChange={e => setTalam(e.target.value)}
                                className="text-[11px] font-semibold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                                style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)' }}
                            >
                                {Object.entries(TALA_LABELS).map(([id, label]) => (
                                    <option key={id} value={id}>{label} ({TALA_BEATS[id]} beats)</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                <span className="tabular-nums font-mono font-bold" style={{ color: '#10b981' }}>{effectiveAavartanaSec.toFixed(2)}s</span>
                                <span className="opacity-50">/ āvartana</span>
                                <span className="opacity-30 mx-1">·</span>
                                <span className="tabular-nums font-mono font-bold" style={{ color: '#a78bfa' }}>{beatsPerSec}</span>
                                <span className="opacity-50">beats/s</span>
                                <span className="opacity-30 mx-1">·</span>
                                <span className="tabular-nums font-mono font-bold" style={{ color: '#fbbf24' }}>{bpm}</span>
                                <span className="opacity-50">BPM</span>
                            </div>
                        </div>
                        {/* Section cues row */}
                        <div className="flex items-center gap-1 px-5 pb-2.5 overflow-x-auto">
                        <span className="text-[10px] uppercase tracking-widest opacity-40 mr-3 flex-shrink-0">Section cues</span>
                        {uniqueSections.map((section, si) => {
                            const t = sectionTimings[section];
                            const isCurrent = currentSection === section;
                            return (
                                <div key={section} className="flex items-center gap-1.5 flex-shrink-0">
                                    {si > 0 && <div className="w-px h-4 mx-1 opacity-20" style={{ background: 'currentColor' }} />}
                                    <span
                                        className="text-[11px] font-black uppercase tracking-widest"
                                        style={{ color: isCurrent ? '#fbbf24' : 'var(--text-primary)', minWidth: 70 }}
                                    >
                                        {section}
                                    </span>
                                    <span
                                        className="text-xs font-mono tabular-nums"
                                        style={{ color: t != null ? '#10b981' : 'var(--text-muted)', opacity: t != null ? 1 : 0.35, minWidth: 36 }}
                                    >
                                        {t != null ? fmt(t) : '--:--'}
                                    </span>
                                    <button
                                        onClick={() => setSectionTimings(prev => ({ ...prev, [section]: currentTime }))}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-100"
                                        style={{ background: isCurrent ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}
                                        title={`Set ${section} start to current time (${fmt(currentTime)})`}
                                    >
                                        {isCurrent ? '● Set' : 'Set'}
                                    </button>
                                    {t != null && (
                                        <button
                                            onClick={() => setSectionTimings(prev => { const n = { ...prev }; delete n[section]; return n; })}
                                            className="text-[10px] opacity-30 hover:opacity-70 px-1"
                                            title="Clear this cue"
                                        >✕</button>
                                    )}
                                </div>
                            );
                        })}
                        <span className="text-[9px] opacity-30 ml-auto flex-shrink-0">
                            Play to the section start, then click Set
                        </span>
                        </div>{/* end section cues row */}
                    </div>
                    );
                })()}

                {/* ── Three Lanes ───────────────────────────────────────────────── */}
                <main
                    className={`flex-1 flex flex-col relative overflow-hidden select-none ${editorMode === 'view' && isDragging ? 'cursor-grabbing' : editorMode === 'view' ? 'cursor-grab' : 'cursor-default'}`}
                    onMouseDown={editorMode === 'view' ? handleDragStart : undefined}
                    onMouseMove={editorMode === 'view' ? handleDragMove : undefined}
                    onMouseUp={editorMode === 'view' ? handleDragEnd : undefined}
                    onMouseLeave={editorMode === 'view' ? handleDragEnd : undefined}
                    onTouchStart={editorMode === 'view' ? handleDragStart : undefined}
                    onTouchMove={editorMode === 'view' ? handleDragMove : undefined}
                    onTouchEnd={editorMode === 'view' ? handleDragEnd : undefined}
                    onClick={editorMode === 'view' ? handleClickSeek : undefined}
                >
                    {/* Playhead */}
                    <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: `${PLAYHEAD * 100}%` }}>
                        <div className="absolute inset-y-0" style={{ width: 24, left: -12, background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.18), transparent)' }} />
                        <div className="absolute inset-y-0 w-1" style={{ left: -0.5, background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }} />
                        <div className="absolute" style={{ top: 0, left: -5, width: 10, height: 10, background: '#10b981', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
                    </div>

                    {/* Lane 1: Waveform Editor */}
                    <div className="relative flex-shrink-0" style={{ height: '24%', borderBottom: `1px solid ${borderColor}` }}>
                        <LaneLabel label="Audio" isDark={isDark} />
                        <WaveformEditor
                            audioBuffer={editedBuffer ?? rawBuffer}
                            currentTime={currentTime}
                            originalDuration={totalDuration || originalDuration}
                            editorMode={editorMode}
                            selection={activeSelection}
                            onSelectionChange={setActiveSelection}
                            sectionMarkers={sectionMarkers}
                            theme={theme}
                            playheadFraction={PLAYHEAD}
                            aavartanaSec={effectiveAavartanaSec}
                        />
                    </div>

                    {/* Lane 2: Swara */}
                    <div className="relative flex-shrink-0" style={{ height: '32%', borderBottom: `1px solid ${borderColor}` }}>
                        <LaneLabel label="Swara" isDark={isDark} />
                        {aavartanas.length > 0 && (
                            <NotationLane
                                aavartanas={aavartanas}
                                currentTime={currentTime}
                                totalDuration={totalDuration}
                                playheadFraction={PLAYHEAD}
                                type="swara"
                                theme={theme}
                                aavartanaSec={effectiveAavartanaSec}
                                aavartanaTimings={aavartanaTimings}
                                editMode={false}
                            />
                        )}
                    </div>

                    {/* Lane 3: Sahitya */}
                    <div className="relative flex-1">
                        <LaneLabel label="Sahitya" isDark={isDark} />
                        {aavartanas.length > 0 && (
                            <NotationLane
                                aavartanas={aavartanas}
                                currentTime={currentTime}
                                totalDuration={totalDuration}
                                playheadFraction={PLAYHEAD}
                                type="sahitya"
                                theme={theme}
                                aavartanaSec={effectiveAavartanaSec}
                                aavartanaTimings={aavartanaTimings}
                                editMode={false}
                            />
                        )}
                    </div>
                </main>

                {/* ── Progress Bar ──────────────────────────────────────────────── */}
                <div
                    className="flex-shrink-0 px-5 py-3 flex items-center gap-3 z-30"
                    style={{
                        background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(248,250,252,0.9)',
                        backdropFilter: 'blur(20px)',
                        borderTop: `1px solid ${borderColor}`,
                    }}
                >
                    <span className="text-[10px] tabular-nums font-mono" style={{ color: 'var(--text-muted)', minWidth: 36 }}>{fmt(currentTime)}</span>

                    {/* Wrapper gives room above the bar for section labels */}
                    <div className="flex-1 relative" style={{ paddingTop: 22 }}>
                        {/* Section marker pins */}
                        {uniqueSections.map(section => {
                            const t = sectionTimings[section];
                            if (t == null) return null;
                            const frac = Math.min(1, t / (totalDuration || 1));
                            // Clamp so label never bleeds outside the track
                            const labelShift = frac < 0.08 ? 'translateX(0)' : frac > 0.92 ? 'translateX(-100%)' : 'translateX(-50%)';
                            return (
                                <div
                                    key={section}
                                    className="absolute bottom-0 flex flex-col cursor-pointer"
                                    style={{ left: `${frac * 100}%`, transform: labelShift, zIndex: 10, alignItems: frac < 0.08 ? 'flex-start' : frac > 0.92 ? 'flex-end' : 'center' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (audioRef.current) audioRef.current.currentTime = t;
                                    }}
                                    title={`${section} — ${fmt(t)}`}
                                >
                                    <span
                                        className="text-[11px] font-medium uppercase tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded mb-0.5"
                                        style={{ background: '#fbbf24', color: '#000', lineHeight: 1.4 }}
                                    >
                                        {section}
                                    </span>
                                    <div className="w-px h-2" style={{ background: '#fbbf24' }} />
                                </div>
                            );
                        })}

                        {/* Track bar */}
                        <div
                            className="h-1.5 rounded-full overflow-hidden cursor-pointer relative"
                            style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                            onClick={handleSeek}
                        >
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress * 100}%`, background: 'linear-gradient(to right,#10b981,#34d399)' }} />
                            {aavartanas.map((_, i) => {
                                const frac = (i * effectiveAavartanaSec) / (totalDuration || 1);
                                if (frac >= 1) return null;
                                return <div key={i} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${frac * 100}%`, background: isDark ? '#fff' : '#000' }} />;
                            })}
                        </div>
                    </div>

                    <span className="text-[10px] tabular-nums font-mono" style={{ color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{fmt(totalDuration)}</span>
                </div>
            </div>

            {/* ── Version History Sidebar ───────────────────────────────────────── */}
            {showHistory && (
                <VersionHistory
                    songId={songId}
                    theme={theme}
                    onClose={() => setShowHistory(false)}
                    onRestore={handleRestore}
                />
            )}

            {/* ── Lyrics Editor Modal ───────────────────────────────────────────── */}
            {showLyrics && composition && (
                <LyricsEditor
                    composition={composition}
                    theme={theme}
                    initialTalam={talam}
                    onSave={(newComp) => setComposition(newComp)}
                    onClose={() => setShowLyrics(false)}
                />
            )}
        </div>
    );
}
