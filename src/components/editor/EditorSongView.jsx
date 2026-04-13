import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import VersionHistory from './VersionHistory';
import LyricsEditor from './LyricsEditor';
import { useTrackMixer } from '../../hooks/useTrackMixer';
import AudioControlZone from '../../zones/audioControlZone/AudioControlZone';
import EditInfoModal from '../../zones/audioControlZone/EditInfoModal';
import SongTrackZone from '../../zones/songTrackZone/SongTrackZone';
import BottomBar from '../../zones/bottomBar/BottomBar';
import { buildAavartanas, buildContentRows, applyTokenEdit } from '../../utils/songParser';
import { applyEditOps, editedTimeToOriginal } from '../../utils/audioEditor';
import { TALA_TEMPLATES } from '../../utils/talaTemplates';
import { ALL_SONGS } from '../../utils/carnaticData';
import { getRagaScale } from '../../utils/ragaScales';
import { audioBufferToWav } from '../../utils/wavEncoder';
import { audioCache, songDataCache } from '../../utils/audioCache';
import { triggerDownload } from '../../utils/triggerDownload';
import { EXPANDED_RAGAM_LIST } from '../../data/ragaList';
import { PX_PER_SEC } from '../../constants/playback';
import { useDragSeek } from '../../hooks/useDragSeek';
import { useSeekBar } from '../../hooks/useSeekBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useDropdown } from '../../hooks/useDropdown';
import { apiUrl } from '../../utils/api';

export default function EditorSongView({ songId, theme, tonicHz, onTonicChange, onBack, canEdit = true }) {
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
    const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error' | null
    const [isProcessing, setIsProcessing] = useState(false); // applying edit ops
    const [avPerRow, setAvPerRow] = useState(1);
    const [fetchError, setFetchError] = useState(null);

    // Song Track Zone mixer — central state for Sound/Sahitya/Swara tracks
    // (mute/solo/volume/visible/heightPx) plus the Sound Track gain graph.
    // wireSoundTrack(audio) is called once after the audio element is built.
    // trackOrder + moveTrack let the user reorder the tracks via the up/down
    // arrows in each track header.
    const { tracks, setTrackState, wireSoundTrack, trackOrder, moveTrack } = useTrackMixer();

    // Track unsaved changes
    const [savedDataStr, setSavedDataStr] = useState('');
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const currentDataStr = JSON.stringify({ composition, editOps, sectionTimings, customAavartanaSec, avartanasPerRow: avPerRow });
    const hasUnsavedChanges = savedDataStr && currentDataStr !== savedDataStr;
    const [isDownloadingAudio, setIsDownloadingAudio] = useState(false);
    const [previewBanner, setPreviewBanner] = useState(null); // { composition, editOps }

    // Drag/seek loop state (handlers come from useDragSeek below)
    const [isLoopEnabled, setIsLoopEnabled] = useState(false);
    const [loopRange, setLoopRange] = useState(null); // { start, end } in seconds
    const [preLoopTime, setPreLoopTime] = useState(null);

    // File swapping
    const [isSwapping, setIsSwapping] = useState(false);
    const audioSwapRef = useRef(null);
    const jsonSwapRef = useRef(null);
    // Files dropdown — click-outside detection (not onMouseLeave) so it
    // doesn't close when the cursor briefly crosses an option boundary.
    const { open: showDownloadMenu, setOpen: setShowDownloadMenu, ref: downloadMenuRef } = useDropdown();
    const [waveZoom, setWaveZoom] = useState(2);

    // Edit Info modal
    const [showEditInfo, setShowEditInfo] = useState(false);
    const [editInfoRaga, setEditInfoRaga] = useState('');
    const [editInfoTala, setEditInfoTala] = useState('');
    const [editInfoComposer, setEditInfoComposer] = useState('');
    const [editInfoType, setEditInfoType] = useState('');
    const [editInfoArohana, setEditInfoArohana] = useState([]);
    const [editInfoAvarohana, setEditInfoAvarohana] = useState([]);
    const [editInfoSaving, setEditInfoSaving] = useState(false);

    // Phase 4: Audio Engine & Mixer State
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(0); // semitones
    const [masterVolume, setMasterVolume] = useState(1.0);
    const [droneOn, setDroneOn] = useState(false);
    const [micMonitorOn, setMicMonitorOn] = useState(false);


    // Canonical compositionType options for the dropdown.
    const COMPOSITION_TYPES = [
        'Geetham', 'Swarajathi', 'Varnam', 'Kriti', 'Tillana', 'Javali',
        'Padam', 'Devaranama', 'Sankeertana', 'Bhajan', 'Slokam', 'Viruttam',
    ];

    const allRagas = useMemo(() => [...new Set([...EXPANDED_RAGAM_LIST, ...ALL_SONGS.map(s => s.raga).filter(r => r && r !== 'All Ragas')])].sort(), []);
    const allTalas = useMemo(() => [...new Set([...Object.keys(TALA_TEMPLATES), ...ALL_SONGS.map(s => s.tala).filter(Boolean)])].sort(), []);
    const allComposers = useMemo(() => {
        const list = [...new Set(ALL_SONGS.map(s => s.composer).filter(Boolean))].sort();
        return list.includes('Unknown') ? ['Unknown', ...list.filter(c => c !== 'Unknown')] : list;
    }, []);

    const isDark = theme !== 'light';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    // Build aavartanas from composition (still used for calibration/waveform)
    const aavartanas = useMemo(() => composition ? buildAavartanas(composition) : [], [composition]);
    // Build content rows for text mode display
    const contentRows = useMemo(() => composition ? buildContentRows(composition) : [], [composition]);
    const autoAavartanaSec = 4.0; // Default for songs without a saved calibration (removes auto-BPM/CompIAM heuristics)
    const effectiveAavartanaSec = customAavartanaSec ?? autoAavartanaSec;

    // Calibration no longer mutates the composition. customAavartanaSec
    // controls the per-row scroll speed via effectiveAavartanaSec, and
    // section cues / contentRowTimings position rows on the audio timeline
    // — so there's no need to pad the composition with empty placeholder
    // rows just to make the notation reach the end of the audio.

    // Unique sections in order
    const uniqueSections = useMemo(
        () => [...new Set(aavartanas.map(av => av.section))],
        [aavartanas]
    );

    // Per-aavartana start times derived from sectionTimings.
    // Returns null when no timings are set (falls back to uniform spacing).
    const aavartanaTimings = useMemo(() => {
        const audioDur = totalDuration || 0;
        const notationDur = aavartanas.length * effectiveAavartanaSec;
        const effDur = Math.max(audioDur, notationDur);

        if (!aavartanas.length || effDur === 0) return null;
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

    // Per-content-row start times — same logic as aavartanaTimings but at the
    // content-row granularity that text mode actually renders. Without this,
    // the Sahitya/Swara tracks ignore section cues entirely and refuse to
    // realign when the user marks a section start.
    const contentRowTimings = useMemo(() => {
        if (!contentRows.length) return null;
        if (!uniqueSections.some(s => sectionTimings[s] != null)) return null;

        const timings = [];
        let cursor = 0;          // natural end of all preceding rows
        let sectionCursor = 0;   // current write position within the active section
        let lastSection = null;

        for (const row of contentRows) {
            if (row.section !== lastSection) {
                // User-marked time wins; otherwise pick up from the natural cursor.
                sectionCursor = sectionTimings[row.section] ?? cursor;
                lastSection = row.section;
            }
            timings.push(sectionCursor);
            sectionCursor += (row.avCount || 1) * effectiveAavartanaSec;
            // Cursor only moves forward — matches aavartanaTimings semantics.
            cursor = Math.max(cursor, sectionCursor);
        }
        return timings;
    }, [contentRows, uniqueSections, sectionTimings, effectiveAavartanaSec]);

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

    // Tala counter origin — beat 1 of the metronome corresponds to the start
    // of the first section (typically Pallavi). Falls back to 0 when nothing
    // has been set yet, so the metronome behaves identically to the old
    // hardcoded "starts at time 0" semantics for unmarked songs.
    const talaStartTime = useMemo(() => {
        const firstSection = uniqueSections[0];
        if (!firstSection) return 0;
        return sectionTimings[firstSection] ?? 0;
    }, [uniqueSections, sectionTimings]);

    // Effective duration for UI limits (fallback to notation length if no audio)
    const effectiveDuration = useMemo(() => {
        const notationDur = aavartanas.length * effectiveAavartanaSec;
        return Math.max(totalDuration, notationDur);
    }, [totalDuration, aavartanas.length, effectiveAavartanaSec]);

    // Per-section [start, end] ranges in seconds. Always derives a band for
    // every section in the composition (not just the ones with user-set
    // cues), so the seek bar can paint section bands regardless of whether
    // the user has marked any cues yet. Mirrors the cursor logic in
    // aavartanaTimings: user-marked starts override; otherwise sections
    // pick up where the previous one ends.
    const sectionRanges = useMemo(() => {
        if (!uniqueSections.length) return [];
        const ranges = [];
        let cursor = 0;
        for (const section of uniqueSections) {
            const count = aavartanas.filter(av => av.section === section).length || 1;
            const start = sectionTimings[section] ?? cursor;
            const end = start + count * effectiveAavartanaSec;
            ranges.push({ section, start, end });
            cursor = Math.max(cursor, end);
        }
        // Stretch the final section so the bands cover the whole timeline
        // when audio is longer than the natural notation length.
        if (ranges.length && effectiveDuration > 0) {
            const last = ranges[ranges.length - 1];
            if (last.end < effectiveDuration) last.end = effectiveDuration;
        }
        return ranges;
    }, [uniqueSections, aavartanas, sectionTimings, effectiveAavartanaSec, effectiveDuration]);

    // Trackpad horizontal-swipe pan handler — converts a raw wheel deltaPx
    // into a time delta and seeks the playhead. Passed to SongTrackZone,
    // which attaches the wheel listener locally to its <main> via
    // useWheelZoom (Phase 4: moved into SongTrackZone for reliability).
    const handleWheelPan = useCallback((deltaPx) => {
        const pxPerSec = PX_PER_SEC * waveZoom;
        if (pxPerSec <= 0) return;
        const dt = deltaPx / pxPerSec;
        const next = Math.max(0, Math.min(effectiveDuration, currentTimeRef.current + dt));
        currentTimeRef.current = next;
        setCurrentTime(next);
        if (audioRef.current && audioRef.current.readyState > 0) {
            audioRef.current.currentTime = next;
        }
    }, [waveZoom, effectiveDuration]);

    // ── Load song data ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!songId) return;
        setFetchError(null);
        
        const cached = songDataCache.get(songId);
        if (cached) {
            setSongData(cached);
            setComposition(cached.composition);
            const { sectionTimings: st, customAavartanaSec: savedCalib, ...ops } = cached.editOps || {};
            const cleanOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
            const cleanSec = st || {};
            // Default the first section (typically Pallavi) to start at 0 so
            // the metronome and section bands have a reference point even
            // before the user touches the Section Cues panel.
            const firstSec = cached.composition?.[0]?.section;
            if (firstSec && cleanSec[firstSec] == null) cleanSec[firstSec] = 0;
            const cleanCalib = savedCalib ?? null;

            setEditOps(cleanOps);
            setSectionTimings(cleanSec);
            setCustomAavartanaSec(cleanCalib);
            setAvPerRow(cached.avartanasPerRow || 1);
            setSavedDataStr(JSON.stringify({ composition: cached.composition, editOps: cleanOps, sectionTimings: cleanSec, customAavartanaSec: cleanCalib, avartanasPerRow: cached.avartanasPerRow || 1 }));
            
            // Default to sahitya if swara is missing
            if (cached.meta && !cached.meta.hasSwara && cached.meta.hasSahitya) {
                setActiveAudioType('sahitya');
            }
            return;
        }

        fetch(apiUrl(`/api/songs/${songId}`))
            .then(r => {
                if (!r.ok) throw new Error(`Song not found (${r.status})`);
                return r.json();
            })
            .then(data => {
                songDataCache.set(songId, data);
                setSongData(data);
                setComposition(data.composition);
                const { sectionTimings: st, customAavartanaSec: savedCalib, ...ops } = data.editOps || {};
                const cleanOps = { trimStart: 0, trimEnd: null, cuts: [], ...ops };
                const cleanSec = st || {};
                const firstSec = data.composition?.[0]?.section;
                if (firstSec && cleanSec[firstSec] == null) cleanSec[firstSec] = 0;
                const cleanCalib = savedCalib ?? null;

                setEditOps(cleanOps);
                setSectionTimings(cleanSec);
                setCustomAavartanaSec(cleanCalib);
                setAvPerRow(data.avartanasPerRow || 1);
                setSavedDataStr(JSON.stringify({ composition: data.composition, editOps: cleanOps, sectionTimings: cleanSec, customAavartanaSec: cleanCalib, avartanasPerRow: data.avartanasPerRow || 1 }));
                
                if (data.meta && !data.meta.hasSwara && data.meta.hasSahitya) {
                    setActiveAudioType('sahitya');
                }

                // Initial Guest favorites sync
                if (!canEdit) {
                    try {
                        const favs = JSON.parse(localStorage.getItem('sangeetha_favorites') || '[]');
                        if (favs.includes(songId)) {
                            setSongData(prev => ({
                                ...prev,
                                meta: { ...prev.meta, isFavorite: true }
                            }));
                        }
                    } catch (e) {}
                }
            })
            .catch(e => {
                console.error('Failed to load song:', e);
                setFetchError(e.message);
            });
    }, [songId]);

    // ── Decode original audio ─────────────────────────────────────────────────
    useEffect(() => {
        if (!songId || !songData?.meta) return;
        
        const hasRequested = activeAudioType === 'sahitya' ? songData.meta.hasSahitya : songData.meta.hasSwara;
        if (!hasRequested) {
            setRawBuffer(null);
            setEditedBuffer(null);
            setTotalDuration(0);
            setCurrentTime(0);
            return;
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
                const res = await fetch(apiUrl(`/api/songs/${songId}/audio?type=${activeAudioType}`));
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
        // Route the new element through the Sound Track gain node so the
        // mixer's mute/solo/volume actually affect output.
        wireSoundTrack(audio);

        audio.addEventListener('loadedmetadata', () => setTotalDuration(audio.duration));
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, [wireSoundTrack]);

    // ── RAF sync loop ─────────────────────────────────────────────────────────
    const smoothTimeRef = useRef(0);
    const lastSyncRef = useRef({ hw: 0, perf: 0 });

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
                    currentTimeRef.current = smoothTimeRef.current;
                    setCurrentTime(smoothTimeRef.current);
                } else if (audioRef.current.src && audioRef.current.readyState > 0) {
                    // Only sync from audio hardware if it has a valid source
                    smoothTimeRef.current = hw;
                    currentTimeRef.current = smoothTimeRef.current;
                    setCurrentTime(smoothTimeRef.current);
                }
            }
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [isLoopEnabled, loopRange]);

    // ── Transport Controls handlers (play/pause/restart/seek) ────────────────
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
        const targetTime = (isLoopEnabled && loopRange) ? loopRange.start : 0;
        // Reset every time source so the Song Track Zone animation snaps to
        // the start even when there is no audio loaded (e.g. the user has
        // only been dragging the lyrics around). The rAF tick reads
        // currentTimeRef directly, so updating it here moves the playhead.
        smoothTimeRef.current = targetTime;
        currentTimeRef.current = targetTime;
        setCurrentTime(targetTime);
        if (audioRef.current) {
            try { audioRef.current.currentTime = targetTime; } catch {}
            if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
        }
    }, [isPlaying, isLoopEnabled, loopRange]);

    // ── Drag to seek (extracted to shared hook) ──────────────────────────────
    const { isDragging, handlers: dragHandlers } = useDragSeek({
        audioRef,
        currentTimeRef,
        setCurrentTime,
        effectiveDuration,
        waveZoom,
        isLoopEnabled,
        loopRange,
        setLoopRange,
        setPreLoopTime,
    });

    // ── Time Controls drag support (Bottom Bar seek bar — extracted to hook) ─
    const { seekBarRef, onMouseDown: handleSeekMouseDown, onTouchStart: handleSeekTouchStart } = useSeekBar({
        audioRef,
        currentTimeRef,
        setCurrentTime,
        effectiveDuration,
    });

    // Track the seek bar's pixel width so we can decide how many times to
    // tile each section name across its band (marquee behaviour).
    const [seekBarWidth, setSeekBarWidth] = useState(0);
    useEffect(() => {
        const el = seekBarRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) setSeekBarWidth(entry.contentRect.width);
        });
        ro.observe(el);
        setSeekBarWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, [seekBarRef]);


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

    // ── Keyboard shortcuts (extracted to shared hook) ────────────────────────
    useKeyboardShortcuts({
        editorMode,
        setEditorMode,
        activeSelection,
        setActiveSelection,
        togglePlay,
        handleUndoLastCut,
        handleResetAllEdits,
        handleDeleteSelection,
        setCustomAavartanaSec,
    });

    // Clear selection when leaving trim/calibrate mode
    useEffect(() => {
        if (editorMode !== 'trim' && editorMode !== 'calibrate') setActiveSelection(null);
    }, [editorMode]);

    // ── Token editing ─────────────────────────────────────────────────────────
    const handleTokenEdit = useCallback((avIdx, tokIdx, field, newText) => {
        if (!composition || !aavartanas[avIdx]) return;
        const newComp = applyTokenEdit(composition, aavartanas, avIdx, tokIdx, field, newText);
        setComposition(newComp);
    }, [composition, aavartanas]);

    // ── Row duplicate / delete (per-content-row icons in Sahitya/Swara tracks) ─
    // Both handlers operate on the contentRow's source coordinates
    // (sectionIdx, contentIdx) and mutate composition. contentRows /
    // aavartanas / aavartanaTimings will recompute via their useMemo deps.
    const handleRowDuplicate = useCallback((rowIdx) => {
        if (!composition) return;
        const row = contentRows[rowIdx];
        if (!row) return;
        const next = structuredClone(composition);
        const sectionContent = next[row.sectionIdx]?.content;
        if (!sectionContent || sectionContent[row.contentIdx] == null) return;
        const clone = structuredClone(sectionContent[row.contentIdx]);
        sectionContent.splice(row.contentIdx + 1, 0, clone);
        setComposition(next);
    }, [composition, contentRows]);

    const handleRowDelete = useCallback((rowIdx) => {
        if (!composition) return;
        const row = contentRows[rowIdx];
        if (!row) return;
        const next = structuredClone(composition);
        const sectionContent = next[row.sectionIdx]?.content;
        if (!sectionContent || sectionContent[row.contentIdx] == null) return;
        sectionContent.splice(row.contentIdx, 1);
        // If the section is now empty, drop it so empty headers don't linger.
        if (sectionContent.length === 0) {
            next.splice(row.sectionIdx, 1);
        }
        setComposition(next);
    }, [composition, contentRows]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!songId || !composition) return;
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ composition, editOps: { ...editOps, sectionTimings, customAavartanaSec }, avartanasPerRow: avPerRow }),
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
            const res = await fetch(apiUrl(`/api/songs/${songId}/audio`));
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

            const res = await fetch(apiUrl('/api/songs/convert-to-mp3'), {
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

    const handleAudioSwap = async (e, type = activeAudioType) => {
        const file = e.target.files?.[0];
        if (!file || !songId) return;

        setIsSwapping(true);
        setSaveStatus(null);
        try {
            const formData = new FormData();
            formData.append('audio', file);
            const res = await fetch(apiUrl(`/api/songs/${songId}/swap-audio?type=${type}`), {
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
                const audioRes = await fetch(apiUrl(`/api/songs/${songId}/audio?type=${type}&t=${Date.now()}`));
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
            const res = await fetch(apiUrl(`/api/songs/${songId}/swap-json`), {
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
        setEditInfoType(songData?.meta?.compositionType || songData?.song_details?.compositionType || '');
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
            const res = await fetch(apiUrl(`/api/songs/${songId}/metadata`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raga: editInfoRaga.trim(),
                    tala: editInfoTala.trim(),
                    composer: editInfoComposer.trim(),
                    compositionType: editInfoType.trim(),
                    arohana: aroStr,
                    avarohana: avaroStr,
                }),
            });
            if (!res.ok) throw new Error('Update failed');
            const data = await res.json();
            setSongData(prev => ({
                ...prev,
                meta: { ...prev.meta, raga: data.raga, tala: data.tala, composer: data.composer, compositionType: data.compositionType },
                song_details: { ...prev.song_details, raga: data.raga, tala: data.tala, composer: data.composer, compositionType: data.compositionType, arohana: aroStr, avarohana: avaroStr }
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


    const handlePublishRequest = async () => {
        if (!songId || !canEdit) return;
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}/publish-request`), {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to request publish');
            const data = await res.json();
            setSongData(prev => ({
                ...prev,
                meta: { ...prev.meta, publishStatus: data.publishStatus }
            }));
            alert(data.publishStatus === 'published' ? 'Song published successfully!' : 'Publish request submitted.');
        } catch (err) {
            alert('Failed to request publish: ' + err.message);
        }
    };


    // Only show loading/error screen if we have absolutely no data.
    // Background re-fetch errors should not break the UI if cached data exists.
    if (!songData) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[var(--bg-primary)]">
                <div className="glass-card max-w-sm w-full p-10 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    
                    {fetchError ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Loading Failed</h2>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed">We couldn't retrieve the composition data. {fetchError}</p>
                            </div>
                            <button
                                onClick={onBack}
                                className="mt-2 w-full py-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-sm tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all"
                            >
                                Back to Library
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/20 flex items-center justify-center backdrop-blur-md bg-emerald-500/5">
                                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin opacity-40" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[var(--bg-card)] animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Opening Song</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 animate-pulse">Synchronizing...</p>
                            </div>
                            <div className="mt-4 flex flex-col items-center gap-3">
                                <p className="text-xs text-[var(--text-muted)] opacity-60">Preparing your audio workspace</p>
                                <button
                                    onClick={onBack}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* ── Audio Control Zone ────────────────────────────────────────
                    Top zone of the layout. Contains:
                      Song Info  |  Transport Controls  |  Speed/Pitch Controls
                                 |  Edit Controls       |  Audio Controls
                                                                  Composer Info
                    Edit Controls live in their own row below; the rest of this
                    zone is the song header (info + transport + manage files). */}
                <AudioControlZone
                    theme={theme}
                    isDark={isDark}
                    borderColor={borderColor}
                    tonicHz={tonicHz}
                    onTonicChange={onTonicChange}
                    songData={songData}
                    songId={songId}
                    onBack={onBack}
                    onSongDataChange={setSongData}
                    onOpenEditInfo={openEditInfo}
                    activeAudioType={activeAudioType}
                    isPlaying={isPlaying}
                    togglePlay={togglePlay}
                    restartAudio={restartAudio}
                    editedBlobUrl={editedBlobUrl}
                    isLoopEnabled={isLoopEnabled}
                    setIsLoopEnabled={setIsLoopEnabled}
                    setLoopRange={setLoopRange}
                    setPreLoopTime={setPreLoopTime}
                    setActiveAudioType={setActiveAudioType}
                    setShowMissingAudioUpload={setShowMissingAudioUpload}
                    currentTime={currentTime}
                    totalDuration={totalDuration}
                    currentSection={currentSection}
                    previewBanner={previewBanner}
                    onPreviewKeep={() => {
                        setComposition(previewBanner.composition);
                        setEditOps(previewBanner.editOps || { trimStart: 0, trimEnd: null, cuts: [] });
                        setPreviewBanner(null);
                    }}
                    onPreviewDiscard={() => {
                        fetch(apiUrl(`/api/songs/${songId}`)).then(r => r.json()).then(data => {
                            setComposition(data.composition);
                            setEditOps(data.editOps || { trimStart: 0, trimEnd: null, cuts: [] });
                        });
                        setPreviewBanner(null);
                    }}
                    waveZoom={waveZoom}
                    setWaveZoom={setWaveZoom}
                    editorMode={editorMode}
                    setEditorMode={setEditorMode}
                    showSections={showSections}
                    setShowSections={setShowSections}
                    uniqueSections={uniqueSections}
                    sectionTimings={sectionTimings}
                    setSectionTimings={setSectionTimings}
                    customAavartanaSec={customAavartanaSec}
                    setCustomAavartanaSec={setCustomAavartanaSec}
                    autoAavartanaSec={autoAavartanaSec}
                    editOpsHistory={editOpsHistory}
                    handleUndoLastCut={handleUndoLastCut}
                    handleResetAllEdits={handleResetAllEdits}
                    showLyrics={showLyrics}
                    setShowLyrics={setShowLyrics}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    handleSave={handleSave}
                    isSaving={isSaving}
                    saveStatus={saveStatus}
                    handlePublishRequest={handlePublishRequest}
                    canEdit={canEdit}
                    masterVolume={masterVolume}
                    setMasterVolume={setMasterVolume}
                    droneOn={droneOn}
                    setDroneOn={setDroneOn}
                    micMonitorOn={micMonitorOn}
                    setMicMonitorOn={setMicMonitorOn}
                />

                <SongTrackZone
                    dragHandlers={dragHandlers}
                    isDragging={isDragging}
                    tracks={tracks}
                    setTrackState={setTrackState}
                    trackOrder={trackOrder}
                    moveTrack={moveTrack}
                    aavartanas={aavartanas}
                    aavartanaTimings={aavartanaTimings}
                    contentRows={contentRows}
                    contentRowTimings={contentRowTimings}
                    avPerRow={avPerRow}
                    effectiveDuration={effectiveDuration}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    sectionMarkers={sectionMarkers}
                    currentTime={currentTime}
                    currentTimeRef={currentTimeRef}
                    audioRef={audioRef}
                    setCurrentTime={setCurrentTime}
                    editedBuffer={editedBuffer}
                    editorMode={editorMode}
                    activeSelection={activeSelection}
                    setActiveSelection={setActiveSelection}
                    handleDeleteSelection={handleDeleteSelection}
                    waveZoom={waveZoom}
                    setWaveZoom={setWaveZoom}
                    handleWheelPan={handleWheelPan}
                    loopRange={loopRange}
                    handleTokenEdit={handleTokenEdit}
                    handleRowDuplicate={handleRowDuplicate}
                    handleRowDelete={handleRowDelete}
                    canEdit={canEdit}
                    theme={theme}
                    isDark={isDark}
                    borderColor={borderColor}
                />

                <BottomBar
                    /* Admin Controls (Files dropdown — relocated from header) */
                    songData={songData}
                    songId={songId}
                    showDownloadMenu={showDownloadMenu}
                    setShowDownloadMenu={setShowDownloadMenu}
                    downloadMenuRef={downloadMenuRef}
                    activeAudioType={activeAudioType}
                    isDownloadingAudio={isDownloadingAudio}
                    editedBuffer={editedBuffer}
                    handleDownloadJSON={handleDownloadJSON}
                    handleDownloadOriginalAudio={handleDownloadOriginalAudio}
                    handleDownloadEditedMP3={handleDownloadEditedMP3}
                    audioSwapRef={audioSwapRef}
                    jsonSwapRef={jsonSwapRef}
                    handleAudioSwap={handleAudioSwap}
                    handleJsonSwap={handleJsonSwap}
                    /* Publish flow */
                    publishStatus={songData?.meta?.publishStatus || 'draft'}
                    onPublishStatusChange={(next) => setSongData(prev => prev ? ({ ...prev, meta: { ...prev.meta, publishStatus: next } }) : prev)}
                    /* Time Controls + playback */
                    currentTime={currentTime}
                    effectiveDuration={effectiveDuration}
                    currentSection={currentSection}
                    sectionRanges={sectionRanges}
                    aavartanas={aavartanas}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    seekBarRef={seekBarRef}
                    seekBarWidth={seekBarWidth}
                    onSeekMouseDown={handleSeekMouseDown}
                    onSeekTouchStart={handleSeekTouchStart}
                    onSeek={(t) => {
                        if (audioRef.current && audioRef.current.readyState > 0) {
                            audioRef.current.currentTime = t;
                        }
                        currentTimeRef.current = t;
                        setCurrentTime(t);
                    }}
                    /* Metronome */
                    tala={songData?.meta?.tala}
                    talaStartTime={talaStartTime}
                    isDark={isDark}
                    borderColor={borderColor}
                    canEdit={canEdit}
                />
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
                    initialAvPerRow={avPerRow}
                    onSave={(newComp, newAvPerRow) => {
                        setComposition(newComp);
                        if (newAvPerRow) setAvPerRow(newAvPerRow);
                    }}
                    onClose={() => setShowLyrics(false)}
                />
            )}

            {showEditInfo && (
                <EditInfoModal
                    editInfoRaga={editInfoRaga}
                    setEditInfoRaga={setEditInfoRaga}
                    editInfoTala={editInfoTala}
                    setEditInfoTala={setEditInfoTala}
                    editInfoComposer={editInfoComposer}
                    setEditInfoComposer={setEditInfoComposer}
                    editInfoType={editInfoType}
                    setEditInfoType={setEditInfoType}
                    editInfoArohana={editInfoArohana}
                    setEditInfoArohana={setEditInfoArohana}
                    editInfoAvarohana={editInfoAvarohana}
                    setEditInfoAvarohana={setEditInfoAvarohana}
                    editInfoSaving={editInfoSaving}
                    allRagas={allRagas}
                    allTalas={allTalas}
                    allComposers={allComposers}
                    compositionTypes={COMPOSITION_TYPES}
                    onSave={saveEditInfo}
                    onClose={() => setShowEditInfo(false)}
                    isDark={isDark}
                    borderColor={borderColor}
                />
            )}
        </div>
    );
}
