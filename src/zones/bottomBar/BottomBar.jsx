import React from 'react';
import AdminControls from './AdminControls';
import PublishButton from './PublishButton';
import TimeControls from './TimeControls';
import Metronome from './Metronome';

/**
 * Bottom Bar — bottom zone of the Song View.
 *
 * Layout (left → right):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [Files] [Publish]      ........ TimeControls ......  [Metro] │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *   • Left: AdminControls (Files dropdown) + PublishButton
 *   • Middle: TimeControls (seek bar with section bands), pushed right
 *     by a flex spacer so it sits flush against the metronome — no big
 *     visual gap between the seek bar and the beat counter
 *   • Right: Metronome (tala-aware beat counter)
 *
 * The whole bar shares one chrome (background, padding, border-top).
 */
export default function BottomBar({
    // Admin Controls (Files dropdown — relocated from header)
    songData,
    songId,
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
    // Publish flow
    publishStatus,
    onPublishStatusChange,
    // Time Controls + shared playback state
    currentTime,
    effectiveDuration,
    currentSection,
    sectionRanges,
    aavartanas,
    effectiveAavartanaSec,
    seekBarRef,
    seekBarWidth,
    onSeekMouseDown,
    onSeekTouchStart,
    onSeek,
    // Metronome
    tala,
    talaStartTime,
    // theme
    isDark,
    borderColor,
}) {
    return (
        <div
            className="flex-shrink-0 flex items-center gap-3"
            style={{
                padding: '14px 20px 18px',
                background: isDark ? 'rgba(10,10,15,0.9)' : 'rgba(248,250,252,0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: `1px solid ${borderColor}`,
                zIndex: 30,
                position: 'relative',
            }}
        >
            {/* Left: Files dropdown + Publish button */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <AdminControls
                    songData={songData}
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
                    isDark={isDark}
                    borderColor={borderColor}
                />
                <PublishButton
                    songId={songId}
                    publishStatus={publishStatus}
                    onStatusChange={onPublishStatusChange}
                    isDark={isDark}
                    borderColor={borderColor}
                />
            </div>

            {/* Middle: TimeControls — flex-1 with justify-end so it sits
                flush against the metronome on the right (no big middle gap) */}
            <div className="flex-1 flex justify-end items-center min-w-0">
                <TimeControls
                    currentTime={currentTime}
                    effectiveDuration={effectiveDuration}
                    currentSection={currentSection}
                    sectionRanges={sectionRanges}
                    aavartanas={aavartanas}
                    effectiveAavartanaSec={effectiveAavartanaSec}
                    seekBarRef={seekBarRef}
                    seekBarWidth={seekBarWidth}
                    onSeekMouseDown={onSeekMouseDown}
                    onSeekTouchStart={onSeekTouchStart}
                    onSeek={onSeek}
                    isDark={isDark}
                    borderColor={borderColor}
                />
            </div>

            {/* Right: Metronome — flush against TimeControls */}
            <Metronome
                tala={tala}
                currentTime={currentTime}
                effectiveAavartanaSec={effectiveAavartanaSec}
                talaStartTime={talaStartTime}
                isDark={isDark}
                borderColor={borderColor}
            />
        </div>
    );
}
