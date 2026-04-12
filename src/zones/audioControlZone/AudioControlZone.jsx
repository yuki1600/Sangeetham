import React from 'react';
import SongInfoPanel from './SongInfoPanel';
import TransportControls from './TransportControls';
import AnalysisTools from './AnalysisTools';
import ComposerInfoPanel from './ComposerInfoPanel';
import PitchMixerRow from './PitchMixerRow';
import WorkflowPanel from './WorkflowPanel';

/**
 * Audio Control Zone — top zone of the Song View.
 *
 * Implements the 4-column, 2-row grid layout from the PRD/Mockup.
 *
 * Cell layout map:
 *   [Song Info] [Transport ] [Speed/Pitch] [Workflow ]
 *   [ (span)  ] [Analysis  ] [Audio Mix  ] [ (span)   ]
 */
export default function AudioControlZone({
    // theme
    theme,
    isDark,
    borderColor,
    // tonic / pitch detection
    tonicHz,
    onTonicChange,
    // Song Info (Cell 1)
    songData,
    songId,
    onBack,
    onSongDataChange,
    onOpenEditInfo,
    // Transport Controls (Cell 2 Top)
    activeAudioType,
    isPlaying,
    togglePlay,
    restartAudio,
    editedBlobUrl,
    isLoopEnabled,
    setIsLoopEnabled,
    setLoopRange,
    setPreLoopTime,
    setActiveAudioType,
    setShowMissingAudioUpload,
    currentTime,
    totalDuration,
    currentSection,
    // Analysis Tools (Cell 2 Bottom)
    waveZoom,
    setWaveZoom,
    editorMode,
    setEditorMode,
    showSections,
    setShowSections,
    uniqueSections,
    sectionTimings,
    setSectionTimings,
    customAavartanaSec,
    setCustomAavartanaSec,
    autoAavartanaSec,
    editOpsHistory,
    handleUndoLastCut,
    // Workflow & Project (Cell 4)
    showLyrics,
    setShowLyrics,
    showHistory,
    setShowHistory,
    handleSave,
    isSaving,
    saveStatus,
    handleResetAllEdits,
    // Audio Mixer (Cell 3 Bottom)
    masterVolume,
    setMasterVolume,
    droneOn,
    setDroneOn,
    micMonitorOn,
    setMicMonitorOn,
    // Preview banner
    previewBanner,
    onPreviewKeep,
    onPreviewDiscard,
}) {
    return (
        <header
            className="z-30 flex-shrink-0"
            style={{
                background: isDark ? 'rgba(10,10,15,0.92)' : 'rgba(248,250,252,0.96)',
                backdropFilter: 'blur(32px)',
                borderBottom: `1px solid ${borderColor}`,
            }}
        >
            <div className="grid grid-cols-4 gap-x-8 gap-y-0 px-6 py-1.5 items-start">
                
                {/* Section 1: Song Info (Column 1, spanning 1/4) */}
                <div className="col-span-1 border-r pr-8 pt-2" style={{ borderColor }}>
                    <SongInfoPanel
                        songData={songData}
                        songId={songId}
                        onBack={onBack}
                        onSongDataChange={onSongDataChange}
                        onOpenEditInfo={onOpenEditInfo}
                        isDark={isDark}
                        borderColor={borderColor}
                    />
                </div>

                {/* Section 2: Audio Controls (Columns 2-3, spanning 2/4) */}
                <div className="col-span-2 flex items-start justify-center gap-8 py-1">
                    
                    {/* Left Column: Playback & Pitch */}
                    <div className="flex flex-col items-center gap-3">
                        <TransportControls
                            isPlaying={isPlaying}
                            togglePlay={togglePlay}
                            restartAudio={restartAudio}
                            editedBlobUrl={editedBlobUrl}
                            isLoopEnabled={isLoopEnabled}
                            setIsLoopEnabled={setIsLoopEnabled}
                            setLoopRange={setLoopRange}
                            setPreLoopTime={setPreLoopTime}
                            activeAudioType={activeAudioType}
                            setActiveAudioType={setActiveAudioType}
                            songData={songData}
                            setShowMissingAudioUpload={setShowMissingAudioUpload}
                            isDark={isDark}
                            borderColor={borderColor}
                        />
                        <div className="w-full">
                            <PitchMixerRow
                                tonicHz={tonicHz}
                                onTonicChange={onTonicChange}
                                isDark={isDark}
                                borderColor={borderColor}
                            />
                        </div>
                    </div>

                    {/* Right Column: Analysis & Workflow */}
                    <div className="flex flex-col items-center gap-3 pt-1">
                        <AnalysisTools
                            showSections={showSections}
                            setShowSections={setShowSections}
                            editorMode={editorMode}
                            setEditorMode={setEditorMode}
                            customAavartanaSec={customAavartanaSec}
                            editOpsHistory={editOpsHistory}
                            handleUndoLastCut={handleUndoLastCut}
                            sectionTimingsCount={Object.keys(sectionTimings).length}
                            isDark={isDark}
                            borderColor={borderColor}
                        />
                        <WorkflowPanel
                            songData={songData}
                            showLyrics={showLyrics}
                            setShowLyrics={setShowLyrics}
                            showHistory={showHistory}
                            setShowHistory={setShowHistory}
                            handleSave={handleSave}
                            isSaving={isSaving}
                            saveStatus={saveStatus}
                            handleResetAllEdits={handleResetAllEdits}
                            isDark={isDark}
                            borderColor={borderColor}
                        />
                    </div>

                </div>

                {/* Section 3: Composer (Column 4, spanning 1/4) */}
                <div className="col-span-1 border-l pl-8 flex flex-col justify-center py-2" style={{ borderColor }}>
                    <ComposerInfoPanel
                        songData={songData}
                        isDark={isDark}
                        borderColor={borderColor}
                    />
                </div>
            </div>

            {/* Preview banner — appears when previewing a saved version */}
            {previewBanner && (
                <div className="flex items-center justify-between px-6 py-2 flex-shrink-0 text-xs"
                    style={{ background: 'rgba(251,191,36,0.1)', borderBottom: `1px solid ${borderColor}` }}>
                    <span style={{ color: '#fbbf24' }}>Previewing a saved version. Changes are not permanent yet.</span>
                    <div className="flex items-center gap-2">
                        <button onClick={onPreviewKeep} className="font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                            Keep this version
                        </button>
                        <button onClick={onPreviewDiscard} className="opacity-60 px-2 py-1 hover:opacity-100">Discard</button>
                    </div>
                </div>
            )}

            {/* Section Cues Panel overlay — managed in the same row as Analysis tools for visual connection */}
            {showSections && (
                <div 
                    className="border-t animate-in slide-in-from-top-4 duration-300"
                    style={{ 
                        borderColor, 
                        background: isDark ? 'rgba(251,191,36,0.03)' : 'rgba(251,191,36,0.02)' 
                    }}
                >
                    <div className="flex items-center justify-center gap-6 px-6 py-3 overflow-x-auto no-scrollbar">
                        {uniqueSections.map((section, si) => {
                            const t = sectionTimings[section];
                            const isCurrent = currentSection === section;
                            return (
                                <div key={section} className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isCurrent ? 'text-amber-400' : 'opacity-60'}`}>
                                        {section}
                                    </span>
                                    <span className="text-xs font-mono tabular-nums opacity-80" style={{ color: t != null ? '#10b981' : undefined }}>
                                        {t != null ? (new Date(t * 1000).toISOString().substr(14, 5)) : '--:--'}
                                    </span>
                                    <button
                                        onClick={() => setSectionTimings(prev => ({ ...prev, [section]: currentTime }))}
                                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                    >
                                        Set
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </header>
    );
}
