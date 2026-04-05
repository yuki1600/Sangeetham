import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    ArrowLeft, Play, Pause, RotateCcw, Save, Download,
    History, Undo2, RefreshCw, ChevronDown, ChevronUp,
    Check, AlertCircle, Scissors, FileText, X,
    FileAudio, FileJson, Upload, Layers, Music, Gauge, Globe, LayoutGrid,
    Repeat, Pencil, ZoomIn, ZoomOut, Plus, Minus
} from 'lucide-react';
import LaneLabel from '../LaneLabel';
import NotationLane from '../NotationLane';
import WaveformEditor from './WaveformEditor';
import VersionHistory from './VersionHistory';
import LyricsEditor from './LyricsEditor';
import CompactPitchBar from '../CompactPitchBar';
import { buildAavartanas, applyTokenEdit } from '../../utils/songParser';

// ── Session Cache ─────────────────────────────────────────────────────────────
// Stores decoded AudioBuffer objects to make navigation "seamless"
const audioCache = new Map(); // key: `${songId}-${type}`
// Stores song metadata and composition data
const songDataCache = new Map(); // key: `${songId}`
import { applyEditOps, getEditedDuration, editedTimeToOriginal } from '../../utils/audioEditor';
import { TALA_TEMPLATES } from '../../utils/talaTemplates';
import { ALL_SONGS } from '../../utils/carnaticData';
import { getRagaScale } from '../../utils/ragaScales';
import SwaraScale from '../SwaraScale';
import { audioBufferToWav } from '../../utils/wavEncoder';

const AAVARTANA_PX = 320;
const PLAYHEAD = 0.25;

export default function EditorSongView({ songId, theme, tonicHz, onTonicChange, onBack, readOnly = false }) {
    // Song data from server
    const [songData, setSongData] = useState(null);
    const [composition, setComposition] = useState(null);
    const [editOps, setEditOps] = useState({ trimStart: 0, trimEnd: null, cuts: [] });

    // Audio
    const [rawBuffer, setRawBuffer] = useState(null);       // original decoded
    const [editedBuffer, setEditedBuffer] = useState(null); // after applyEditOps
    const [editedBlobUrl, setEditedBlobUrl] = useState(null);
    const [activeAudioType, setActiveAudioType] = useState('swara'); // 'swara' | 'sahitya'
    const [showMissingAudioUpload, setShowMissingAudioUpload] = useState(false);
    const blobUrlRef = useRef(null);

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const audioRef = useRef(null);
    const animRef = useRef(null);
    const currentTimeRef = useRef(0);

    // Editor state
    const [editorMode, setEditorMode] = useState('view'); // 'view' | 'trim' | 'calibrate'
    const [customAavartanaSec, setCustomAavartanaSec] = useState(null); // null = auto, number = user-calibrated
    const [activeSelection, setActiveSelection] = useState(null); // { startTime, endTime }
    const [editOpsHistory, setEditOpsHistory] = useState([]); // undo stack
    const [showHistory, setShowHistory] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showSections, setShowSections] = useState(false);
    const [sectionTimings, setSectionTimings] = useState({}); // { "Pallavi": 0, "Anupallavi": 45.2, ... }
    const [isSaving, setIsSaving] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error' | null
    const [isProcessing, setIsProcessing] = useState(false); // applying edit ops
    const [sahityaCollapsed, setSahityaCollapsed] = useState(false);
    const [swaraCollapsed, setSwaraCollapsed] = useState(false);

    // Track unsaved changes
    const [savedDataStr, setSavedDataStr] = useState('');
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const currentDataStr = JSON.stringify({ composition, editOps, sectionTimings, customAavartanaSec });
    const hasUnsavedChanges = savedDataStr && currentDataStr !== savedDataStr;
    const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
    const [previewBanner, setPreviewBanner] = useState(null); // { composition, editOps }

    // Drag/seek (same pattern as SongSection)
    const [isDragging, setIsDragging] = useState(false);
    const [isLoopEnabled, setIsLoopEnabled] = useState(false);
    const [loopRange, setLoopRange] = useState(null); // { start, end } in seconds
    const [preLoopTime, setPreLoopTime] = useState(null);
    const dragData = useRef({ startX: 0, startTime: 0, isSelecting: false, selectionStart: 0 });

    // File swapping
    const [isSwapping, setIsSwapping] = useState(false);
    const audioSwapRef = useRef(null);
    const jsonSwapRef = useRef(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [waveZoom, setWaveZoom] = useState(1);

    // Edit Info modal
    const [showEditInfo, setShowEditInfo] = useState(false);
    const [editInfoRaga, setEditInfoRaga] = useState('');
    const [editInfoTala, setEditInfoTala] = useState('');
    const [editInfoComposer, setEditInfoComposer] = useState('');
    const [editInfoArohana, setEditInfoArohana] = useState([]);
    const [editInfoAvarohana, setEditInfoAvarohana] = useState([]);
    const [editInfoSaving, setEditInfoSaving] = useState(false);

    const EXPANDED_RAGAM_LIST = [
        'Abhogi', 'Anandabhairavi', 'Arabhi', 'Asaveri', 'Atana', 'Bhairavi', 'Bilahari', 'Bowli',
        'Brindavani', 'Chakravakam', 'Chalanaata', 'Charukesi', 'Darbar', 'Dhanyasi', 'Dharmavati',
        'Gaurimanohari', 'Gowlai', 'Hamsadhwani', 'Hamsanadam', 'Hari Kambodhi', 'Hindolam',
        'Kalyani', 'Kambodhi', 'Kamas', 'Kanada', 'Kapi', 'Kedaragowla', 'Keeravani', 'Kharaharapriya',
        'Latangi', 'Madhyamavati', 'Malahari', 'Mayamalavagowlai', 'Mohanam', 'Mukhari', 'Nalinakanthi',
        'Nattai', 'Navaroj', 'Pantuvarali', 'Poorvikalyani', 'Punnagavarali', 'Reethigowlai', 'Revathi',
        'Saaranga', 'Sahana', 'Sama', 'Saveri', 'Shankarabharanam', 'Shanmukhapriya', 'Simhendramadhyamam',
        'Sindhu Bhairavi', 'Sri', 'Sri Ranjani', 'Subhapantuvarali', 'Suddha Dhanyasi', 'Suddha Saveri',
        'Surutti', 'Thodi', 'Vachaspati', 'Varali', 'Vasanta', 'Yadukula Kambodhi'
    ];
    const allRagas = useMemo(() => [...new Set([...EXPANDED_RAGAM_LIST, ...ALL_SONGS.map(s => s.raga).filter(r => r && r !== 'All Ragas')])].sort(), []);
    const allTalas = useMemo(() => [...new Set([...Object.keys(TALA_TEMPLATES), ...ALL_SONGS.map(s => s.tala).filter(Boolean)])].sort(), []);
    const allComposers = useMemo(() => {
        const list = [...new Set(ALL_SONGS.map(s => s.composer).filter(Boolean))].sort();
        return list.includes('Unknown') ? ['Unknown', ...list.filter(c => c !== 'Unknown')] : list;
    }, []);

    const isDark = theme !== 'light';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    // Build aavartanas from composition
    const aavartanas = useMemo(() => composition ? buildAavartanas(composition) : [], [composition]);
    const autoAavartanaSec = totalDuration > 0 && aavartanas.length > 0
        ? totalDuration / aavartanas.length
        : 3.3;
    const effectiveAavartanaSec = customAavartanaSec ?? autoAavartanaSec;

    // Pad composition with empty avartanas when calibration leaves notation short
    useEffect(() => {
        if (!composition || !customAavartanaSec || customAavartanaSec <= 0 || totalDuration <= 0 || readOnly) return;
        const currentCount = aavartanas.length;
        const needed = Math.ceil(totalDuration / customAavartanaSec);
        if (currentCount >= needed) return;

        const tala = songData?.meta?.tala || '';
        const template = TALA_TEMPLATES[tala] || '_ _ _ _ ||';
        const toAdd = needed - currentCount;

        // Distribute extra avartanas evenly across sections
        const sections = [...new Set(composition.map(s => s.section))];
        const perSection = Math.floor(toAdd / sections.length);
        let remainder = toAdd - perSection * sections.length;

        const newComp = structuredClone(composition);
        for (const sec of newComp) {
            const extra = perSection + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            if (extra <= 0) continue;
            // Append empty avartanas as new content entries in this section
            const emptyPattern = template.replace(/\|\|$/, '').trim();
            for (let i = 0; i < extra; i++) {
                sec.content.push({ swaram: emptyPattern + ' ||', sahityam: emptyPattern + ' ||' });
            }
        }
        setComposition(newComp);
    }, [customAavartanaSec, totalDuration, aavartanas.length, readOnly]);

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

        const cached = songDataCache.get(songId);
        if (cached) {
            setSongData(cached);
            setComposition(cached.composition);
            const { sectionTimings: st, customAavartanaSec: savedCalib, ...ops } = cached.editOps || {};
            const cleanOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
            const cleanSec = st || {};
            const cleanCalib = savedCalib ?? null;
            
            setEditOps(cleanOps);
            setSectionTimings(cleanSec);
            setCustomAavartanaSec(cleanCalib);
            setIsPublished(!!cached.meta?.isPublished);
            setSavedDataStr(JSON.stringify({ composition: cached.composition, editOps: cleanOps, sectionTimings: cleanSec, customAavartanaSec: cleanCalib }));
            
            // Default to sahitya if swara is missing
            if (cached.meta && !cached.meta.hasSwara && cached.meta.hasSahitya) {
                setActiveAudioType('sahitya');
            }
            return;
        }

        fetch(`/api/songs/${songId}`)
            .then(r => r.json())
            .then(data => {
                songDataCache.set(songId, data);
                setSongData(data);
                setComposition(data.composition);
                const { sectionTimings: st, customAavartanaSec: savedCalib, ...ops } = data.editOps || {};
                const cleanOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
                const cleanSec = st || {};
                const cleanCalib = savedCalib ?? null;

                setEditOps(cleanOps);
                setSectionTimings(cleanSec);
                setCustomAavartanaSec(cleanCalib);
                setIsPublished(!!data.meta?.isPublished);
                setSavedDataStr(JSON.stringify({ composition: data.composition, editOps: cleanOps, sectionTimings: cleanSec, customAavartanaSec: cleanCalib }));
                
                // Default to sahitya if swara is missing
                if (data.meta && !data.meta.hasSwara && data.meta.hasSahitya) {
                    setActiveAudioType('sahitya');
                }
            })
            .catch(e => console.error('Failed to load song:', e));
    }, [songId]);

    // ── Decode original audio ─────────────────────────────────────────────────
    useEffect(() => {
        if (!songId) return;
        
        // Re-check if the audio actually exists in meta before trying to fetch
        if (songData?.meta) {
            const hasRequested = activeAudioType === 'sahitya' ? songData.meta.hasSahitya : songData.meta.hasSwara;
            if (!hasRequested) {
                setRawBuffer(null);
                setEditedBuffer(null);
                setTotalDuration(0);
                setCurrentTime(0);
                return;
            }
        }

        const cacheKey = `${songId}-${activeAudioType}`;
        const cached = audioCache.get(cacheKey);
        if (cached) {
            setRawBuffer(cached);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setRawBuffer(null); // Clear while switching if not cached
                const res = await fetch(`/api/songs/${songId}/audio?type=${activeAudioType}`);
                if (!res.ok) throw new Error('Audio not found');
                const arrayBuf = await res.arrayBuffer();
                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(arrayBuf);
                ctx.close();
                if (!cancelled) {
                    audioCache.set(cacheKey, decoded);
                    setRawBuffer(decoded);
                }
            } catch (e) {
                console.error('Audio decode error:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [songId, activeAudioType, songData?.meta]);

    // ── Apply edit ops whenever rawBuffer or editOps changes ─────────────────
    useEffect(() => {
        if (!rawBuffer) {
            setEditedBuffer(null);
            setTotalDuration(0);
            return;
        }
        let cancelled = false;
        let timeout = null;

        const isDefault = editOps.trimStart === 0 && (editOps.trimEnd === null || editOps.trimEnd === undefined) && (!editOps.cuts || editOps.cuts.length === 0);

        if (isDefault) {
            // Instant load for default/cached
            setEditedBuffer(rawBuffer);
            setIsProcessing(false);
            return;
        }

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
        }, 50);

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
    const smoothTimeRef = useRef(0);
    const lastSyncRef = useRef({ hw: 0, perf: 0 });
    const lastReactTimeRef = useRef(-1);

    useEffect(() => {
        const tick = (now) => {
            if (audioRef.current) {
                let hw = audioRef.current.currentTime;
                const isPlaying = !audioRef.current.paused && audioRef.current.readyState > 0;

                // Looping logic
                if (isPlaying && isLoopEnabled && loopRange && hw >= loopRange.end) {
                    audioRef.current.currentTime = loopRange.start;
                    hw = loopRange.start;
                }
                
                if (hw !== lastSyncRef.current.hw) {
                    lastSyncRef.current = { hw, perf: now };
                }

                if (isPlaying) {
                    const elapsed = (now - lastSyncRef.current.perf) / 1000;
                    let interp = hw + elapsed;
                    if (audioRef.current.duration) interp = Math.min(interp, audioRef.current.duration);
                    smoothTimeRef.current = interp;
                } else {
                    smoothTimeRef.current = hw;
                }

                currentTimeRef.current = smoothTimeRef.current;
                setCurrentTime(smoothTimeRef.current);
            }
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [isLoopEnabled, loopRange]);

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
        const targetTime = (isLoopEnabled && loopRange) ? loopRange.start : 0;
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    }, [isPlaying, isLoopEnabled, loopRange]);

    // ── Drag to seek ──────────────────────────────────────────────────────────
    const handleDragStart = useCallback((e) => {
        setIsDragging(true);
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;
        
        const isSelecting = isLoopEnabled;
        const startTime = currentTimeRef.current + ((clickX - playheadX) / AAVARTANA_PX * effectiveAavartanaSec);

        dragData.current = {
            startX: x,
            startTime: currentTimeRef.current,
            selectionStart: startTime,
            isSelecting
        };

        if (isSelecting) {
            if (loopRange === null) {
                setPreLoopTime(currentTimeRef.current);
            }
            setLoopRange({ start: startTime, end: startTime });
        }
    }, [isLoopEnabled, loopRange, effectiveAavartanaSec]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const playheadX = rect.width * PLAYHEAD;

        if (dragData.current.isSelecting) {
            const currentT = currentTimeRef.current + ((clickX - playheadX) / AAVARTANA_PX * effectiveAavartanaSec);
            const start = Math.min(dragData.current.selectionStart, currentT);
            const end = Math.max(dragData.current.selectionStart, currentT);
            setLoopRange({
                start: Math.max(0, start),
                end: Math.min(totalDuration, end)
            });
        } else {
            const deltaX = x - dragData.current.startX;
            const deltaT = -(deltaX / AAVARTANA_PX) * effectiveAavartanaSec;
            let newTime = Math.max(0, Math.min(dragData.current.startTime + deltaT, totalDuration));
            if (audioRef.current) audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [isDragging, totalDuration, effectiveAavartanaSec]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        if (dragData.current.isSelecting && loopRange) {
            if (audioRef.current) {
                audioRef.current.currentTime = loopRange.start;
            }
            setCurrentTime(loopRange.start);
        }
    }, [loopRange]);

    const handleClickSeek = useCallback((e) => {
        const x = e.clientX ?? (e.touches && e.touches[0].clientX);
        const deltaX = Math.abs(x - dragData.current.startX);
        if (deltaX < 5) {
            // If a loop exists and we click (not drag), revert to pre-loop position
            if (isLoopEnabled && loopRange) {
                if (preLoopTime !== null) {
                    if (audioRef.current) {
                        audioRef.current.currentTime = preLoopTime;
                    }
                    setCurrentTime(preLoopTime);
                }
                setLoopRange(null);
                setPreLoopTime(null);
                return;
            }

            if (isLoopEnabled) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = x - rect.left;
            const playheadX = rect.width * PLAYHEAD;
            const deltaT = (clickX - playheadX) / AAVARTANA_PX * effectiveAavartanaSec;
            let newTime = Math.max(0, Math.min(currentTimeRef.current + deltaT, totalDuration));
            if (audioRef.current) audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [totalDuration, effectiveAavartanaSec, isLoopEnabled, loopRange, preLoopTime]);

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

    const handleDeleteSelection = useCallback(() => {
        if (!activeSelection?.endTime || !rawBuffer) return;
        const editedStart = Math.min(activeSelection.startTime, activeSelection.endTime);
        const editedEnd = Math.max(activeSelection.startTime, activeSelection.endTime);
        if (editedEnd - editedStart < 0.1) return;
        // Map edited-timeline selection back to original-timeline coordinates
        const origStart = editedTimeToOriginal(editedStart, rawBuffer.duration, editOps);
        const origEnd = editedTimeToOriginal(editedEnd, rawBuffer.duration, editOps);
        setEditOpsHistory(prev => [...prev, editOps]);
        setEditOps(ops => ({ ...ops, cuts: [...(ops.cuts || []), { start: origStart, end: origEnd }] }));
        setActiveSelection(null);
    }, [activeSelection, editOps, rawBuffer]);

    const handleResetAllEdits = useCallback(() => {
        setEditOpsHistory([]);
        setEditOps({ trimStart: 0, trimEnd: null, cuts: [] });
        setSectionTimings({});
        setCustomAavartanaSec(null);
    }, []);

    // ── Back Button Intercept ──────────────────────────────────────────────────
    const handleBackAttempt = () => {
        if (hasUnsavedChanges && !readOnly) {
            setShowUnsavedWarning(true);
        } else {
            onBack();
        }
    };

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
            if ((e.key === 't' || e.key === 'T') && !readOnly) {
                setEditorMode(m => m === 'trim' ? 'view' : 'trim');
                return;
            }

            // C: toggle calibrate mode
            if ((e.key === 'c' || e.key === 'C') && !readOnly) {
                setEditorMode(m => m === 'calibrate' ? 'view' : 'calibrate');
                return;
            }

            // Ctrl+Z / Cmd+Z: undo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !readOnly) {
                e.preventDefault();
                handleUndoLastCut();
                return;
            }

            // R: reset all edits
            if ((e.key === 'r' || e.key === 'R') && !readOnly) {
                handleResetAllEdits();
                return;
            }

            if (readOnly || (editorMode !== 'trim' && editorMode !== 'calibrate')) return;

            if (e.key === 'Escape') {
                setActiveSelection(null);
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelection?.endTime != null) {
                const start = Math.min(activeSelection.startTime, activeSelection.endTime);
                const end = Math.max(activeSelection.startTime, activeSelection.endTime);
                if (end - start < 0.1) return;
                e.preventDefault();
                if (editorMode === 'calibrate') {
                    setCustomAavartanaSec(end - start);
                    setActiveSelection(null);
                    setEditorMode('view');
                } else {
                    handleDeleteSelection();
                }
            }
            // Enter: apply calibration in calibrate mode
            if (e.key === 'Enter' && editorMode === 'calibrate' && activeSelection?.endTime != null) {
                const start = Math.min(activeSelection.startTime, activeSelection.endTime);
                const end = Math.max(activeSelection.startTime, activeSelection.endTime);
                if (end - start < 0.1) return;
                e.preventDefault();
                setCustomAavartanaSec(end - start);
                setActiveSelection(null);
                setEditorMode('view');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [editorMode, activeSelection, editOps, togglePlay, handleUndoLastCut, handleResetAllEdits]);

    // Clear selection when leaving trim/calibrate mode
    useEffect(() => {
        if (editorMode !== 'trim' && editorMode !== 'calibrate') setActiveSelection(null);
    }, [editorMode]);

    // ── Token editing ─────────────────────────────────────────────────────────
    const handleTokenEdit = useCallback((avIdx, tokIdx, field, newText) => {
        if (readOnly || !composition || !aavartanas[avIdx]) return;
        const newComp = applyTokenEdit(composition, aavartanas, avIdx, tokIdx, field, newText);
        setComposition(newComp);
    }, [composition, aavartanas, readOnly]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!songId || !composition) return;
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const res = await fetch(`/api/songs/${songId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ composition, editOps: { ...editOps, sectionTimings, customAavartanaSec } }),
            });
            if (!res.ok) throw new Error('Save failed');
            setSaveStatus('ok');
            setSavedDataStr(currentDataStr); // Update base snapshot to clear unsaved changes
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
        const { sectionTimings: st, customAavartanaSec: savedCalib, ...ops } = data.editOps || {};
        const restoreOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
        if (permanent) {
            setComposition(data.composition);
            setEditOps(restoreOps);
            setSectionTimings(st || {});
            setCustomAavartanaSec(savedCalib ?? null);
            setPreviewBanner(null);
            setShowHistory(false);
        } else {
            setPreviewBanner(data);
            setComposition(data.composition);
            setEditOps(restoreOps);
            setSectionTimings(st || {});
            setCustomAavartanaSec(savedCalib ?? null);
        }
    }, []);

    // ── Downloads ─────────────────────────────────────────────────────────────
    const handleDownloadJSON = (isEdited = true) => {
        if (!composition || !songData) return;
        const dataToSave = isEdited ? composition : songData.composition;
        const blob = new Blob([JSON.stringify({ song_details: songData.song_details, composition: dataToSave }, null, 2)], { type: 'application/json' });
        triggerDownload(blob, `${songData.meta?.title || 'song'}${isEdited ? '-edited' : ''}.json`);
    };

    const handleDownloadOriginalAudio = async () => {
        if (!songId) return;
        try {
            const res = await fetch(`/api/songs/${songId}/audio`);
            const blob = await res.blob();
            triggerDownload(blob, songData.meta?.audioFilename || 'original.mp3');
        } catch (e) {
            console.error('Download failed:', e);
        }
    };

    const handleDownloadEditedMP3 = async () => {
        if (!editedBuffer) return;
        setIsDownloadingAudio(true);
        try {
            const wavBlob = audioBufferToWav(editedBuffer);
            const formData = new FormData();
            formData.append('wav', wavBlob, 'edited.wav');

            const res = await fetch('/api/songs/convert-to-mp3', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Conversion failed');
            
            const mp3Blob = await res.blob();
            triggerDownload(mp3Blob, `${songData?.meta?.title || 'song'}-edited.mp3`);
        } catch (e) {
            console.error('MP3 Download failed:', e);
            alert('Failed to convert to MP3. Please check server logs.');
        } finally {
            setIsDownloadingAudio(false);
        }
    };

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    const handleAudioSwap = async (e, type = activeAudioType) => {
        const file = e.target.files?.[0];
        if (!file || !songId) return;

        setIsSwapping(true);
        setSaveStatus(null);
        try {
            const formData = new FormData();
            formData.append('audio', file);
            const res = await fetch(`/api/songs/${songId}/swap-audio?type=${type}`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Failed to swap audio');
            const data = await res.json();
            
            // Update local meta to reflect the new file
            setSongData(prev => ({ ...prev, meta: data.meta }));
            
            // If we just uploaded the active type, reload it
            if (type === activeAudioType) {
                setRawBuffer(null);
                const audioRes = await fetch(`/api/songs/${songId}/audio?type=${type}&t=${Date.now()}`);
                const arrayBuf = await audioRes.arrayBuffer();
                const ctx = new AudioContext();
                const decoded = await ctx.decodeAudioData(arrayBuf);
                ctx.close();
                setRawBuffer(decoded);
            }
            setSaveStatus('ok');
            setShowMissingAudioUpload(false);
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSwapping(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleJsonSwap = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !songId) return;

        setIsSwapping(true);
        setSaveStatus(null);
        try {
            const formData = new FormData();
            formData.append('json', file);
            const res = await fetch(`/api/songs/${songId}/swap-json`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Failed to swap JSON');
            
            const data = await res.json();
            setComposition(data.composition);
            setSongData(prev => ({ 
                ...prev, 
                meta: data.meta, 
                song_details: {
                    ...prev.song_details,
                    title: data.meta.title,
                    raga: data.meta.raga,
                    tala: data.meta.tala,
                    composer: data.meta.composer
                }
            }));
            setSaveStatus('ok');
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsSwapping(false);
            if (e.target) e.target.value = '';
        }
    };

    const openEditInfo = () => {
        const raga = songData?.meta?.raga || '';
        setEditInfoRaga(raga);
        setEditInfoTala(songData?.meta?.tala || '');
        setEditInfoComposer(songData?.meta?.composer || '');
        // Load arohana/avarohana from song_details, or fall back to raga database
        const sd = songData?.song_details || {};
        const scale = getRagaScale(raga);
        const aro = sd.arohana
            ? (typeof sd.arohana === 'string' ? sd.arohana.split(/\s+/).filter(Boolean) : sd.arohana)
            : (scale?.arohana || []);
        const avaro = sd.avarohana
            ? (typeof sd.avarohana === 'string' ? sd.avarohana.split(/\s+/).filter(Boolean) : sd.avarohana)
            : (scale?.avarohana || []);
        setEditInfoArohana([...aro]);
        setEditInfoAvarohana([...avaro]);
        setShowEditInfo(true);
    };

    const saveEditInfo = async () => {
        if (!editInfoRaga.trim() || !editInfoTala.trim()) return;
        setEditInfoSaving(true);
        const aroStr = editInfoArohana.filter(s => s.trim()).join(' ');
        const avaroStr = editInfoAvarohana.filter(s => s.trim()).join(' ');
        try {
            const res = await fetch(`/api/songs/${songId}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raga: editInfoRaga.trim(),
                    tala: editInfoTala.trim(),
                    composer: editInfoComposer.trim(),
                    arohana: aroStr,
                    avarohana: avaroStr,
                }),
            });
            if (!res.ok) throw new Error('Update failed');
            const data = await res.json();
            setSongData(prev => ({
                ...prev,
                meta: { ...prev.meta, raga: data.raga, tala: data.tala, composer: data.composer },
                song_details: { ...prev.song_details, raga: data.raga, tala: data.tala, composer: data.composer, arohana: aroStr, avarohana: avaroStr }
            }));
            if (data.talaChanged && data.composition) {
                setComposition(data.composition);
            }
            setShowEditInfo(false);
        } catch (err) {
            alert('Failed to update: ' + err.message);
        } finally {
            setEditInfoSaving(false);
        }
    };

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
                    {/* Header content: song info left, controls right */}
                    <div className="flex px-5 pt-2 pb-1 gap-4">
                        {/* Left: back + song info */}
                        <div className="flex items-start gap-3 min-w-0 flex-shrink-0" style={{ maxWidth: '30%' }}>
                            <button
                                onClick={onBack}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border flex-shrink-0 mt-0.5"
                                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                            >
                                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </button>
                            <div className="min-w-0">
                                <div className="font-bold text-sm truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {songData.meta?.title || 'Untitled'}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                    {songData.meta?.raga && (
                                        <span>
                                            <span className="opacity-40">Raga: </span>
                                            <span style={{ color: '#10b981' }}>{songData.meta.raga}</span>
                                        </span>
                                    )}
                                    {songData.meta?.tala && (
                                        <span>
                                            <span className="opacity-40">Tala: </span>
                                            <span style={{ color: '#60a5fa' }}>{songData.meta.tala}</span>
                                        </span>
                                    )}
                                    {songData.meta?.composer && songData.meta.composer !== 'Unknown' && (
                                        <span>
                                            <span className="opacity-40">Composer: </span>
                                            <span style={{ color: '#fbbf24' }}>{songData.meta.composer}</span>
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const sd = songData?.song_details || {};
                                    const ragaName = songData?.meta?.raga || sd.raga || '';
                                    const scale = getRagaScale(ragaName);
                                    const aro = sd.arohana
                                        ? (typeof sd.arohana === 'string' ? sd.arohana : sd.arohana.join(' '))
                                        : (scale ? scale.arohana.join(' ') : null);
                                    const avaro = sd.avarohana
                                        ? (typeof sd.avarohana === 'string' ? sd.avarohana : sd.avarohana.join(' '))
                                        : (scale ? scale.avarohana.join(' ') : null);
                                    if (!aro && !avaro) return null;
                                    return (
                                        <div className="flex flex-col gap-1 mt-1.5">
                                            {aro && (
                                                <div className="flex items-center gap-2">
                                                    <span className="opacity-40 uppercase text-[10px] font-bold">Aro: </span>
                                                    <SwaraScale swaras={aro} color="#a855f7" className="text-sm font-bold" />
                                                </div>
                                            )}
                                            {avaro && (
                                                <div className="flex items-center gap-2">
                                                    <span className="opacity-40 uppercase text-[10px] font-bold">Avaro: </span>
                                                    <SwaraScale swaras={avaro} color="#a855f7" className="text-sm font-bold" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {!readOnly && (
                                    <button
                                        onClick={openEditInfo}
                                        className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                                        style={{ color: 'var(--text-muted)', borderColor }}
                                    >
                                        <Pencil className="w-3 h-3" />
                                        Edit Info
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right: pitch bar, playback, manage files stacked */}
                        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            {/* Pitch bar + manage files row */}
                            <div className="flex items-center justify-between w-full">
                                <div />
                                <CompactPitchBar tonicHz={tonicHz} onTonicChange={onTonicChange} theme={theme} />
                                <div className="flex items-center gap-2">
                            {/* Manage Files dropdown */}
                            <div className="relative">
                                    <button
                                        onClick={() => setShowDownloadMenu(s => !s)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${showDownloadMenu ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : ''}`}
                                        style={{ borderColor: showDownloadMenu ? undefined : borderColor, color: showDownloadMenu ? undefined : 'var(--text-muted)' }}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Manage Files
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    {showDownloadMenu && (
                                        <div
                                            className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden z-50 shadow-2xl"
                                            style={{ background: isDark ? '#141420' : '#fff', borderColor, minWidth: 220 }}
                                            onMouseLeave={() => setShowDownloadMenu(false)}
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
                                                { label: 'Original JSON', icon: FileJson, action: () => handleDownloadJSON(false) },
                                                { label: 'Edited JSON (Current)', icon: Check, action: () => handleDownloadJSON(true), color: '#10b981' },
                                                { label: 'Original Audio (.mp3)', icon: FileAudio, action: handleDownloadOriginalAudio },
                                                { 
                                                    label: isDownloadingAudio ? 'Converting...' : 'Edited Audio (.mp3)', 
                                                    icon: isDownloadingAudio ? RefreshCw : FileAudio, 
                                                    action: handleDownloadEditedMP3, 
                                                    disabled: !editedBuffer || isDownloadingAudio,
                                                    color: '#10b981' 
                                                },
                                            ].map(item => (
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
                                            
                                            {!readOnly && (
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

                                {/* Hidden swap inputs (Only needed in edit mode) */}
                                {!readOnly && (
                                    <>
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
                                    </>
                                )}
                                </div>
                            </div>
                            {/* Playback controls */}
                            <div className="flex items-center justify-center gap-8 py-1">
                        <div
                            className="flex items-center gap-6 px-8 py-1.5 rounded-3xl"
                            style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}
                        >
                            {/* Section badge */}
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
                                style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)' }}>
                                {currentSection || 'Pallavi'}
                            </div>

                            <div className="flex items-center gap-3">
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

                                <button
                                    onClick={restartAudio}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:scale-105"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
                                >
                                    <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                </button>

                                {/* Swara/Sahitya Toggle */}
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

                {/* ── Edit Toolbar (Hidden in read-only mode) ──────────────────── */}
                {!readOnly && (
                    <>
                        <div
                            className="relative flex items-center justify-center gap-3 px-5 py-3 flex-shrink-0"
                            style={{ borderBottom: `1px solid ${showSections ? 'transparent' : borderColor}`, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}
                        >
                            {/* Center aligned button group */}
                            <button
                                onClick={() => setShowSections(s => !s)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all"
                                style={{
                                    borderColor: showSections ? 'rgba(251,191,36,0.5)' : borderColor,
                                    background: showSections ? 'rgba(251,191,36,0.1)' : 'transparent',
                                    color: showSections ? '#fbbf24' : 'var(--text-muted)',
                                }}
                                title="Set section start times"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Sections
                                <span className="text-[10px] opacity-60 tabular-nums ml-0.5">
                                    {Object.keys(sectionTimings).length > 0 ? Object.keys(sectionTimings).length : ''}
                                </span>
                            </button>

                            <button
                                onClick={() => setEditorMode(m => m === 'trim' ? 'view' : 'trim')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ml-2"
                                style={{
                                    borderColor: editorMode === 'trim' ? 'rgba(239,68,68,0.4)' : borderColor,
                                    background: editorMode === 'trim' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                    color: editorMode === 'trim' ? '#ef4444' : 'var(--text-muted)',
                                }}
                                title="Toggle trim mode (T)"
                            >
                                <Scissors className="w-4 h-4" />
                                Trim
                            </button>

                            {/* Zoom controls */}
                            <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-xl border" style={{ borderColor }}>
                                <button
                                    onClick={() => setWaveZoom(z => Math.max(0.5, z / 1.5))}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
                                    style={{ color: 'var(--text-muted)' }}
                                    title="Zoom out"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                {[1, 2, 5, 10].map(z => (
                                    <button
                                        key={z}
                                        onClick={() => setWaveZoom(z)}
                                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all"
                                        style={{
                                            background: Math.abs(waveZoom - z) < 0.05 ? 'rgba(16,185,129,0.8)' : 'transparent',
                                            color: Math.abs(waveZoom - z) < 0.05 ? '#fff' : 'var(--text-muted)',
                                        }}
                                    >
                                        {z}x
                                    </button>
                                ))}
                                <button
                                    onClick={() => setWaveZoom(z => Math.min(10, z * 1.5))}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
                                    style={{ color: 'var(--text-muted)' }}
                                    title="Zoom in"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="range"
                                    min={Math.log(0.5)}
                                    max={Math.log(10)}
                                    step={0.01}
                                    value={Math.log(waveZoom)}
                                    onChange={e => setWaveZoom(Math.exp(Number(e.target.value)))}
                                    className="w-20 h-1 accent-emerald-500 ml-1"
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>

                            <button
                                onClick={() => setEditorMode(m => m === 'calibrate' ? 'view' : 'calibrate')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
                                style={{
                                    borderColor: editorMode === 'calibrate' ? 'rgba(59,130,246,0.4)' : customAavartanaSec ? 'rgba(59,130,246,0.25)' : borderColor,
                                    background: editorMode === 'calibrate' ? 'rgba(59,130,246,0.1)' : customAavartanaSec ? 'rgba(59,130,246,0.06)' : 'transparent',
                                    color: editorMode === 'calibrate' ? '#3b82f6' : customAavartanaSec ? '#60a5fa' : 'var(--text-muted)',
                                }}
                                title="Calibrate āvartana speed — select 1 āvartana on waveform (C)"
                            >
                                <Gauge className="w-4 h-4" />
                                Calibrate
                            </button>
                            <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                value={parseFloat((customAavartanaSec ?? autoAavartanaSec).toFixed(2))}
                                onChange={e => {
                                    const v = parseFloat(e.target.value);
                                    setCustomAavartanaSec(v > 0 ? v : null);
                                }}
                                className="w-16 text-center px-1 py-1.5 rounded-lg border text-xs font-bold tabular-nums focus:outline-none focus:border-blue-500/50"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                    borderColor: customAavartanaSec ? 'rgba(59,130,246,0.4)' : borderColor,
                                    color: customAavartanaSec ? '#60a5fa' : 'var(--text-primary)',
                                }}
                                title="Āvartana duration in seconds — edit directly to calibrate"
                            />
                            <span className="text-[10px] opacity-40 -ml-1">s</span>

                            <div className="w-px h-6 mx-1" style={{ background: borderColor }} />

                            <button
                                onClick={handleUndoLastCut}
                                disabled={editOpsHistory.length === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-30"
                                style={{ borderColor, color: 'var(--text-muted)' }}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo2 className="w-4 h-4" />
                                Undo
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
                            </button>

                            <div className="w-px h-6 mx-1" style={{ background: borderColor }} />

                            <button
                                onClick={() => setShowHistory(s => !s)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${showHistory ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : ''}`}
                                style={{ borderColor: showHistory ? undefined : borderColor, color: showHistory ? undefined : 'var(--text-muted)' }}
                                title="View Edit History"
                            >
                                <History className="w-4 h-4" />
                                History
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{
                                    background: saveStatus === 'ok' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                                    color: saveStatus ? (saveStatus === 'ok' ? '#10b981' : '#ef4444') : '#fff',
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
                                {saveStatus === 'ok' ? 'Saved' : saveStatus === 'error' ? 'Failed' : 'Save'}
                            </button>

                            {/* Status / hint — absolute right so it doesn't shift the centred buttons */}
                            {!showHistory && (
                                <div className="absolute right-5 flex items-center gap-2">
                                    {isProcessing && (
                                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                            Processing...
                                        </div>
                                    )}
                                    <span className="text-[10px] opacity-40 hidden md:inline">
                                        {editorMode === 'calibrate' && activeSelection
                                            ? `Selected: ${Math.abs((activeSelection.endTime ?? activeSelection.startTime) - activeSelection.startTime).toFixed(2)}s — Enter to apply · Esc to cancel`
                                            : editorMode === 'calibrate'
                                            ? 'Drag on waveform to select 1 āvartana'
                                            : editorMode === 'trim' && activeSelection
                                            ? 'Del to remove · Esc to cancel'
                                            : editorMode === 'trim'
                                            ? 'Drag waveform to select'
                                            : 'Use Lyrics to edit notation'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Section Timings Panel ────────────────────────────────────── */}
                        {showSections && (() => {
                            const talamRaw = songData?.song_details?.tala || songData?.tala || 'Adi';
                            const talamNorm = talamRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
                            let beats = 8;
                            if (talamNorm.includes('rupaka')) beats = 6;
                            else if (talamNorm.includes('misrachapu')) beats = 7;
                            else if (talamNorm.includes('khandachapu')) beats = 5;
                            else if (talamNorm.includes('khandatriputa')) beats = 9;
                            else if (talamNorm.includes('tisratriputa')) beats = 7;
                            else if (talamNorm.includes('chatusraeka')) beats = 4;
                            else if (talamNorm.includes('tisraeka')) beats = 3;
                            else if (talamNorm.includes('sankeernaeka')) beats = 9;

                            const bpm = Math.round((beats / effectiveAavartanaSec) * 60);
                            const beatsPerSec = (beats / effectiveAavartanaSec).toFixed(2);
                            const autoSec = autoAavartanaSec.toFixed(2);
                            return (
                            <div style={{ borderBottom: `1px solid ${borderColor}`, background: isDark ? 'rgba(251,191,36,0.04)' : 'rgba(180,130,0,0.05)' }}>
                                {/* Calibration & Tempo Row */}
                                <div className="flex flex-wrap items-center gap-x-10 px-5 pt-3 pb-2.5 flex-shrink-0">
                                    {/* Speed Section */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase font-black tracking-widest flex-shrink-0" style={{ color: isDark ? '#fff' : '#000' }}>Speed</span>
                                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{
                                                background: customAavartanaSec ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.08)',
                                                color: customAavartanaSec ? '#60a5fa' : '#10b981',
                                                border: `1px solid ${customAavartanaSec ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.2)'}`,
                                            }}>
                                                <Gauge className="w-3 h-3" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.5"
                                                    value={parseFloat((customAavartanaSec ?? autoAavartanaSec).toFixed(2))}
                                                    onChange={e => {
                                                        const v = parseFloat(e.target.value);
                                                        setCustomAavartanaSec(v > 0 ? v : null);
                                                    }}
                                                    className="w-12 text-center font-mono font-bold tabular-nums bg-transparent border-none outline-none focus:ring-0"
                                                    style={{ color: 'inherit' }}
                                                    title="Edit āvartana duration in seconds"
                                                />
                                                <span className="opacity-60">s / āvartana</span>
                                                {customAavartanaSec && <span className="opacity-40 font-normal">(calibrated)</span>}
                                            </span>
                                            {customAavartanaSec ? (
                                                <>
                                                    <span className="opacity-30">was {autoSec}s auto</span>
                                                    <button
                                                        onClick={() => setCustomAavartanaSec(null)}
                                                        className="text-[10px] opacity-40 hover:opacity-100 px-1 transition-opacity"
                                                        title="Reset to auto-calculated speed"
                                                    >✕ Reset</button>
                                                </>
                                            ) : (
                                                <span className="opacity-40">(auto)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Talam Section */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase font-black tracking-widest flex-shrink-0" style={{ color: isDark ? '#fff' : '#000' }}>Talam</span>
                                        <span 
                                            className="text-[12px] font-black px-2 py-0.5 rounded-lg"
                                            style={{ background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', color: '#10b981' }}
                                        >
                                            {talamRaw} ({beats} beats)
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            <span className="tabular-nums font-mono font-bold" style={{ color: '#10b981' }}>{effectiveAavartanaSec.toFixed(2)}s</span>
                                            <span className="opacity-50">/ āvartana</span>
                                            <span className="opacity-30 mx-1">·</span>
                                            <span className="tabular-nums font-mono font-bold" style={{ color: '#a78bfa' }}>{beatsPerSec}</span>
                                            <span className="opacity-50">beats/s</span>
                                            <span className="opacity-30 mx-1">·</span>
                                            <span className="tabular-nums font-mono font-bold" style={{ color: '#10b981' }}>{bpm}</span>
                                            <span className="opacity-50">BPM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Cues Row */}
                                <div className="flex items-center gap-1 px-5 pb-3 overflow-x-auto custom-scrollbar">
                                <span className="text-[10px] uppercase font-black tracking-widest mr-4 flex-shrink-0" style={{ color: isDark ? '#fff' : '#000' }}>Section cues</span>
                                {uniqueSections.map((section, si) => {
                                    const t = sectionTimings[section];
                                    const isCurrent = currentSection === section;
                                    return (
                                        <div key={section} className="flex items-center gap-2 flex-shrink-0">
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
                                </div>
                            </div>
                            );
                        })()}
                    </>
                )}

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
                    {/* Visual playhead */}
                    <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: `${PLAYHEAD * 100}%` }}>
                        <div className="absolute inset-y-0" style={{ width: 24, left: -12, background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.18), transparent)' }} />
                        <div className="absolute inset-y-0 w-1" style={{ left: -0.5, background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }} />
                        <div className="absolute" style={{ top: 0, left: -5, width: 10, height: 10, background: '#10b981', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
                    </div>

                    {/* Selection Overlay */}
                    {loopRange && (
                        <div
                            className="absolute inset-y-0 z-10 pointer-events-none transition-none"
                            style={{
                                left: `calc(${PLAYHEAD * 100}% + ${(loopRange.start - currentTime) / effectiveAavartanaSec * AAVARTANA_PX}px)`,
                                width: `${(loopRange.end - loopRange.start) / effectiveAavartanaSec * AAVARTANA_PX}px`,
                                background: 'rgba(16,185,129,0.15)',
                                borderLeft: '1px solid rgba(16,185,129,0.5)',
                                borderRight: '1px solid rgba(16,185,129,0.5)',
                                willChange: 'left, width'
                            }}
                        >
                            {/* Label */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                <Repeat className="w-12 h-12 text-emerald-400" />
                            </div>
                        </div>
                    )}

                    {/* Lane 1: Waveform Editor */}
                    <div className="relative flex-shrink-0" style={{ height: 120, borderBottom: `1px solid ${borderColor}` }}>
                        <LaneLabel label="Audio" isDark={isDark} />
                        <WaveformEditor
                            audioBuffer={editedBuffer}
                            currentTime={currentTime}
                            timeRef={currentTimeRef}
                            originalDuration={totalDuration}
                            editorMode={editorMode}
                            selection={activeSelection}
                            onSelectionChange={setActiveSelection}
                            sectionMarkers={sectionMarkers}
                            theme={theme}
                            playheadFraction={PLAYHEAD}
                            aavartanaSec={effectiveAavartanaSec}
                            zoom={waveZoom}
                            onZoomChange={setWaveZoom}
                            onSeek={(t) => {
                                if (audioRef.current) audioRef.current.currentTime = t;
                                currentTimeRef.current = t;
                                setCurrentTime(t);
                            }}
                        />
                        {/* Delete selection popup */}
                        {editorMode === 'trim' && activeSelection && activeSelection.endTime != null &&
                            Math.abs(activeSelection.endTime - activeSelection.startTime) >= 0.1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-xl shadow-xl border"
                                style={{
                                    background: isDark ? 'rgba(20,20,32,0.95)' : 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(8px)',
                                    borderColor: 'rgba(239,68,68,0.3)',
                                }}
                            >
                                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                                    {Math.abs(activeSelection.endTime - activeSelection.startTime).toFixed(2)}s selected
                                </span>
                                <button
                                    onClick={handleDeleteSelection}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                                    style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                                >
                                    <Scissors className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                                <button
                                    onClick={() => setActiveSelection(null)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all opacity-50 hover:opacity-100"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lane 2: Sahitya */}
                    <div className="relative transition-all duration-200" style={{
                        flexShrink: 0,
                        height: sahityaCollapsed ? 28 : 140,
                        borderBottom: `1px solid ${borderColor}`,
                        overflow: 'hidden',
                    }}>
                        <div
                            className="absolute top-0 left-0 right-0 z-30 flex items-center cursor-pointer select-none"
                            style={{ height: '28px' }}
                            onClick={() => setSahityaCollapsed(c => !c)}
                        >
                            <div className="flex items-center gap-1.5 ml-4 text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg"
                                style={{
                                    color: isDark ? '#fff' : '#000',
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 15px rgba(0,0,0,0.08)',
                                }}
                            >
                                {sahityaCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                Sahitya
                            </div>
                        </div>
                        {!sahityaCollapsed && aavartanas.length > 0 && (
                            <div className="absolute inset-0" style={{ top: '0px' }}>
                                <NotationLane
                                    aavartanas={aavartanas}
                                    aavartanaTimings={aavartanaTimings}
                                    currentTime={currentTime}
                                    timeRef={currentTimeRef}
                                    totalDuration={totalDuration}
                                    playheadFraction={PLAYHEAD}
                                    aavartanaSec={effectiveAavartanaSec}
                                    type="sahitya"
                                    theme={theme}
                                    onTokenEdit={handleTokenEdit}
                                    readOnly={readOnly}
                                />
                            </div>
                        )}
                    </div>

                    {/* Lane 3: Swara */}
                    <div className="relative transition-all duration-200" style={{
                        flexShrink: 0,
                        height: swaraCollapsed ? 28 : 140,
                        overflow: 'hidden',
                    }}>
                        <div
                            className="absolute top-0 left-0 right-0 z-30 flex items-center cursor-pointer select-none"
                            style={{ height: '28px' }}
                            onClick={() => setSwaraCollapsed(c => !c)}
                        >
                            <div className="flex items-center gap-1.5 ml-4 text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg"
                                style={{
                                    color: isDark ? '#fff' : '#000',
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 15px rgba(0,0,0,0.08)',
                                }}
                            >
                                {swaraCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                Swara
                            </div>
                        </div>
                        {!swaraCollapsed && aavartanas.length > 0 && (
                            <div className="absolute inset-0" style={{ top: '0px' }}>
                                <NotationLane
                                    aavartanas={aavartanas}
                                    aavartanaTimings={aavartanaTimings}
                                    currentTime={currentTime}
                                    timeRef={currentTimeRef}
                                    totalDuration={totalDuration}
                                    playheadFraction={PLAYHEAD}
                                    aavartanaSec={effectiveAavartanaSec}
                                    type="swara"
                                    theme={theme}
                                    onTokenEdit={handleTokenEdit}
                                    readOnly={readOnly}
                                />
                            </div>
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

            {/* ── Missing Audio Upload Modal ─────────────────────────────────── */}
            {showMissingAudioUpload && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                >
                    <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl" style={{ background: isDark ? '#141420' : '#fff', borderColor }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Missing Audio</h2>
                            <button onClick={() => { setShowMissingAudioUpload(false); setActiveAudioType(activeAudioType === 'swara' ? 'sahitya' : 'swara'); }} className="opacity-60">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm opacity-60 mb-6">
                            The {activeAudioType} track has not been uploaded for this song. Please select a file to continue.
                        </p>
                        
                        <button
                            onClick={() => { audioSwapRef.current.dataset.type = activeAudioType; audioSwapRef.current?.click(); }}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-dashed transition-all hover:bg-emerald-500/5 mb-6"
                            style={{ borderColor: 'rgba(16,185,129,0.3)' }}
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-emerald-500">Upload {activeAudioType}</div>
                                <div className="text-[10px] uppercase tracking-tight opacity-40">Select .mp3 file</div>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => { setShowMissingAudioUpload(false); setActiveAudioType(activeAudioType === 'swara' ? 'sahitya' : 'swara'); }}
                            className="w-full py-3 rounded-xl border text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
                            style={{ borderColor }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Unsaved Changes Warning Modal ──────────────────────────────────── */}
            {showUnsavedWarning && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                >
                    <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl" style={{ background: isDark ? '#141420' : '#fff', borderColor }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-red-500" style={{ fontFamily: "'Outfit', sans-serif" }}>Unsaved Changes</h2>
                            <button onClick={() => setShowUnsavedWarning(false)} className="opacity-60 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm opacity-80 mb-6 leading-relaxed">
                            You have unsaved changes to this song. Are you sure you want to go back? All your recent edits will be lost.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { setShowUnsavedWarning(false); onBack(); }}
                                className="w-full py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                Discard Changes
                            </button>
                            <button 
                                onClick={() => setShowUnsavedWarning(false)}
                                className="w-full py-3 rounded-xl border text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                style={{ borderColor }}
                            >
                                Keep Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Lyrics Editor Modal ───────────────────────────────────────────── */}
            {showLyrics && composition && (
                <LyricsEditor
                    composition={composition}
                    theme={theme}
                    initialTalam={songData?.song_details?.tala || 'adi'}
                    onSave={(newComp) => setComposition(newComp)}
                    onClose={() => setShowLyrics(false)}
                />
            )}

            {/* Edit Info Modal */}
            {showEditInfo && (() => {
                const scaleBoxRow = (label, items, setItems, resetScale) => (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</label>
                            {resetScale && (
                                <button
                                    onClick={() => setItems([...resetScale])}
                                    className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md transition-all hover:bg-purple-500/20"
                                    style={{ color: '#a855f7' }}
                                >
                                    Reset from Raga
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-0 pt-2">
                            <div className="flex rounded-2xl border" style={{ borderColor }}>
                                {items.map((swara, i) => (
                                    <div key={i} className="relative group/box flex flex-col"
                                        style={{ borderRight: i < items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                                        <input
                                            type="text"
                                            value={swara}
                                            onChange={e => {
                                                const next = [...items];
                                                next[i] = e.target.value;
                                                setItems(next);
                                            }}
                                            className="w-14 text-center py-2.5 text-sm font-bold bg-transparent focus:outline-none"
                                            style={{ color: '#a855f7' }}
                                        />
                                        {items.length > 1 && (
                                            <button
                                                onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                                                className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/box:opacity-100 transition-opacity z-10 shadow-sm"
                                                style={{ background: '#ef4444', color: '#fff' }}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setItems(prev => [...prev, ''])}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-dashed ml-2 transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
                                style={{ borderColor, color: 'var(--text-muted)' }}
                                title="Add swara"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
                const scale = getRagaScale(editInfoRaga);
                return (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowEditInfo(false); }}
                >
                    <div
                        className="w-full max-w-2xl rounded-3xl p-6 border overflow-y-auto"
                        style={{ background: isDark ? '#141420' : '#fff', borderColor, maxHeight: '85vh' }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Edit Info</h2>
                            <button onClick={() => setShowEditInfo(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-5 mb-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Ragam *</label>
                                    <input
                                        type="text"
                                        value={editInfoRaga}
                                        onChange={e => {
                                            setEditInfoRaga(e.target.value);
                                            const s = getRagaScale(e.target.value);
                                            if (s && editInfoArohana.length === 0) setEditInfoArohana([...s.arohana]);
                                            if (s && editInfoAvarohana.length === 0) setEditInfoAvarohana([...s.avarohana]);
                                        }}
                                        list="edit-info-ragas"
                                        placeholder="Select ragam..."
                                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                                    />
                                    <datalist id="edit-info-ragas">
                                        {allRagas.map(r => <option key={r} value={r} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Talam *</label>
                                    <input
                                        type="text"
                                        value={editInfoTala}
                                        onChange={e => setEditInfoTala(e.target.value)}
                                        list="edit-info-talas"
                                        placeholder="Select talam..."
                                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                                    />
                                    <datalist id="edit-info-talas">
                                        {allTalas.map(t => <option key={t} value={t} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-50">Composer</label>
                                    <input
                                        type="text"
                                        value={editInfoComposer}
                                        onChange={e => setEditInfoComposer(e.target.value)}
                                        list="edit-info-composers"
                                        placeholder="Composer..."
                                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor, color: 'var(--text-primary)' }}
                                    />
                                    <datalist id="edit-info-composers">
                                        {allComposers.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                            </div>

                            {scaleBoxRow('Arohana', editInfoArohana, setEditInfoArohana, scale?.arohana)}
                            {scaleBoxRow('Avarohana', editInfoAvarohana, setEditInfoAvarohana, scale?.avarohana)}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEditInfo(false)}
                                className="flex-1 py-3 rounded-xl border font-bold text-sm transition-all"
                                style={{ borderColor, color: 'var(--text-muted)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEditInfo}
                                disabled={editInfoSaving || !editInfoRaga.trim() || !editInfoTala.trim()}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                            >
                                {editInfoSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><Check className="w-4 h-4" /> Save</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
