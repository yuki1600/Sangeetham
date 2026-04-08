import React from 'react';
import CompactPitchBar from '../../components/CompactPitchBar';
import SongInfoPanel from './SongInfoPanel';
import TransportControls from './TransportControls';
import EditControls from './EditControls';

/**
 * Audio Control Zone — top zone of the Song View.
 *
 * Mockup cells:
 *   • Song Info (left)
 *   • Transport Controls
 *   • Speed/Pitch Controls (Phase 4)
 *   • Edit Controls
 *   • Audio Controls — master mix (Phase 4)
 *   • Composer Info (currently merged into Song Info)
 *
 * Today's structure (transitional, until the mockup grid lands in Phase 4):
 *
 *   <header>
 *     <flex row>
 *       SongInfoPanel       |  PitchBar + Files dropdown
 *                           |  TransportControls
 *     </flex>
 *     {previewBanner}
 *     EditControls
 *     {sectionCuesPanel}    ← rendered inside EditControls
 *   </header>
 *
 * The Files dropdown (`AdminControls`) belongs in the Bottom Bar per the
 * PRD, but is currently mounted from the header for visual continuity. The
 * Phase 3 relocation will move it down to the BottomBar wrapper alongside
 * the Reset button (currently still in EditControls).
 */
export default function AudioControlZone({
    // theme
    theme,
    isDark,
    borderColor,
    // tonic / pitch bar
    tonicHz,
    onTonicChange,
    // Song Info
    songData,
    songId,
    onBack,
    onSongDataChange,
    onOpenEditInfo,
    // Transport Controls
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
    // Preview banner
    previewBanner,
    onPreviewKeep,
    onPreviewDiscard,
    // Edit Controls
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
    handleResetAllEdits,
    showLyrics,
    setShowLyrics,
    showHistory,
    setShowHistory,
    handleSave,
    isSaving,
    saveStatus,
}) {
    return (
        <header
            className="flex flex-col z-30 flex-shrink-0"
            style={{
                background: isDark ? 'rgba(10,10,15,0.9)' : 'rgba(248,250,252,0.95)',
                backdropFilter: 'blur(20px)',
                borderBottom: 'none',
            }}
        >
            {/* Top row: Song Info (left) and the Transport / Pitch / Files cluster (right) */}
            <div className="flex px-5 pt-4 pb-1 gap-4">
                <SongInfoPanel
                    songData={songData}
                    songId={songId}
                    onBack={onBack}
                    onSongDataChange={onSongDataChange}
                    onOpenEditInfo={onOpenEditInfo}
                    isDark={isDark}
                    borderColor={borderColor}
                />

                {/* Right: pitch bar + transport controls stacked, centered
                    horizontally in the remaining space next to Song Info.
                    Files dropdown lives in BottomBar → AdminControls. */}
                <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="flex items-center justify-center w-full">
                        <CompactPitchBar tonicHz={tonicHz} onTonicChange={onTonicChange} theme={theme} />
                    </div>
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
                </div>
            </div>

            {/* Preview banner — appears when previewing a saved version */}
            {previewBanner && (
                <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 text-xs"
                    style={{ background: 'rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.3)' }}>
                    <span style={{ color: '#fbbf24' }}>Previewing a saved version. Changes are not permanent yet.</span>
                    <div className="flex items-center gap-2">
                        <button onClick={onPreviewKeep} className="font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                            Keep this version
                        </button>
                        <button onClick={onPreviewDiscard} className="opacity-60 px-2 py-1 hover:opacity-100">Discard</button>
                    </div>
                </div>
            )}

            <EditControls
                waveZoom={waveZoom}
                setWaveZoom={setWaveZoom}
                editorMode={editorMode}
                setEditorMode={setEditorMode}
                showSections={showSections}
                setShowSections={setShowSections}
                uniqueSections={uniqueSections}
                sectionTimings={sectionTimings}
                setSectionTimings={setSectionTimings}
                currentSection={currentSection}
                currentTime={currentTime}
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
                isDark={isDark}
                borderColor={borderColor}
            />
        </header>
    );
}
