import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ShrutiSelector from './components/ShrutiSelector';
import DronePlayer from './components/DronePlayer';
import LivePitchMonitor from './components/LivePitchMonitor';
import LessonsPanel from './components/LessonsPanel';
import SongBrowser from './components/SongBrowser';
import ExerciseRunner from './components/ExerciseRunner';
import FeedbackSummary from './components/FeedbackSummary';
import SongSection from './components/SongSection';
import SongsPanel from './components/SongsPanel';
import SongEditor from './components/editor/SongEditor';
import EditorSongView from './components/editor/EditorSongView';
import InfoModal from './components/InfoModal';
import { TONIC_PRESETS } from './utils/swaraUtils';
import { EXERCISES } from './utils/exercises';
import { ChevronRight, Music2 } from 'lucide-react';

/** Parse the URL hash into initial view state (supports refresh-to-restore). */
function parseHash() {
  const hash = window.location.hash.slice(1);
  if (hash === 'editor') return { view: 'editor' };
  if (hash.startsWith('editor-song/')) {
    const id = hash.slice('editor-song/'.length);
    if (id) return { view: 'editor-song', editorSongId: id };
    return { view: 'editor' };
  }
  if (hash.startsWith('song-browser/')) {
    const groupId = hash.slice('song-browser/'.length);
    if (groupId) return { view: 'song-browser', groupId };
  }
  return { view: 'home' };
}

/**
 * Main application — routes between home, song-browser, practicing, and feedback views.
 */
export default function App() {
  const _initial = parseHash();
  const [view, setView] = useState(_initial.view);
  const [tonicHz, setTonicHz] = useState(TONIC_PRESETS[0].hz);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseResults, setExerciseResults] = useState(null);
  const [theme, setTheme] = useState('light');
  const [browsedGroupId, setBrowsedGroupId] = useState(_initial.groupId || null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedEditorSongId, setSelectedEditorSongId] = useState(_initial.editorSongId || null);
  const [editorBackTarget, setEditorBackTarget] = useState('editor'); // Where to go back from editor-song view
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Sync current view to URL hash so page refresh restores the same view
  useEffect(() => {
    let hash = '';
    if (view === 'editor') hash = 'editor';
    else if (view === 'editor-song' && selectedEditorSongId) hash = `editor-song/${selectedEditorSongId}`;
    else if (view === 'song-browser' && browsedGroupId) hash = `song-browser/${browsedGroupId}`;
    // practicing / feedback / song-view are transient — refresh sends to home
    history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname);
  }, [view, selectedEditorSongId, browsedGroupId]);

  // Start exercise directly (from Free Sandbox or Basic Practices)
  const handleStartExercise = useCallback((exercise) => {
    if (exercise.recommendedTonic) {
      setTonicHz(exercise.recommendedTonic);
    }
    setSelectedExercise(exercise);
    setView('practicing');
  }, []);

  // Open song browser for a lesson group
  const handleBrowseGroup = useCallback((groupId) => {
    setBrowsedGroupId(groupId);
    setView('song-browser');
  }, []);

  // Song selected from browser — open SongSection if songViewId, else exercise
  const handleSelectSong = useCallback((song) => {
    // Songs with a dedicated song view → open SongSection
    if (song.songViewId) {
      setSelectedSong(song);
      setView('song-view');
      return;
    }
    if (song.exerciseId) {
      const exercise = EXERCISES.find(e => e.id === song.exerciseId);
      if (exercise) {
        handleStartExercise(exercise);
        return;
      }
    }
    // No exercise mapping — launch sandbox with the song as context
    const sandbox = EXERCISES.find(e => e.id === 'sustain-sa');
    if (sandbox) handleStartExercise({ ...sandbox, name: song.title });
  }, [handleStartExercise]);

  const handleExerciseComplete = useCallback((results) => {
    setExerciseResults(results);
    setView('feedback');
  }, []);

  const handleRetry = useCallback(() => {
    setView('practicing');
  }, []);

  const handleHome = useCallback(() => {
    setSelectedExercise(null);
    setExerciseResults(null);
    setBrowsedGroupId(null);
    setSelectedSong(null);
    setSelectedEditorSongId(null);
    setView('home');
  }, []);

  const handleBackFromSong = useCallback(() => {
    setSelectedSong(null);
    // Go back to song browser if we came from there
    if (browsedGroupId) {
      setView('song-browser');
    } else {
      setView('home');
    }
  }, [browsedGroupId]);

  const handleEditSong = useCallback((id, backTarget = 'editor') => {
    setSelectedEditorSongId(id);
    setEditorBackTarget(backTarget);
    setView('editor-song');
  }, []);

  // Editor views
  if (view === 'editor') {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <SongEditor
          theme={theme}
          onEditSong={(id) => handleEditSong(id, 'editor')}
          onBack={handleHome}
        />
      </div>
    );
  }

  if (view === 'editor-song' && selectedEditorSongId) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <EditorSongView
          songId={selectedEditorSongId}
          theme={theme}
          tonicHz={tonicHz}
          onTonicChange={setTonicHz}
          onBack={() => setView(editorBackTarget)}
        />
      </div>
    );
  }

  // Home view
  if (view === 'home') {
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onEditor={() => setView('editor')}
          onInfo={() => setShowInfo(true)}
        />

        {showInfo && <InfoModal onClose={() => setShowInfo(false)} theme={theme} />}

        <main className="flex-1 px-6 pb-8 max-w-2xl mx-auto w-full">
          <div className="grid gap-5 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-5">
                <ShrutiSelector selectedTonic={tonicHz} onSelect={setTonicHz} />
                <DronePlayer tonicHz={tonicHz} />
              </div>
              <LivePitchMonitor tonicHz={tonicHz} theme={theme} />
            </div>
            <SongsPanel 
              onSelectSong={handleSelectSong} 
              onEditSong={(id) => handleEditSong(id, 'home')}
            />
            <LessonsPanel
              onStartExercise={handleStartExercise}
              onBrowse={handleBrowseGroup}
            />
          </div>
        </main>
      </div>
    );
  }

  // Song browser view
  if (view === 'song-browser' && browsedGroupId) {
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onInfo={() => setShowInfo(true)}
        />
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} theme={theme} />}
        <main className="flex-1 px-6 pb-8 max-w-2xl mx-auto w-full">
          <SongBrowser
            groupId={browsedGroupId}
            onBack={handleHome}
            onSelectSong={handleSelectSong}
            onEditSong={(id) => handleEditSong(id, 'song-browser')}
          />
        </main>
      </div>
    );
  }

  // Practice view
  if (view === 'practicing' && selectedExercise) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <ExerciseRunner
          exercise={selectedExercise}
          tonicHz={tonicHz}
          theme={theme}
          onTonicChange={setTonicHz}
          onComplete={handleExerciseComplete}
          onStop={handleHome}
        />
      </div>
    );
  }

  // Feedback view
  if (view === 'feedback' && exerciseResults) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <FeedbackSummary
          results={exerciseResults}
          theme={theme}
          onRetry={handleRetry}
          onHome={handleHome}
        />
      </div>
    );
  }

  // Song view
  if (view === 'song-view' && selectedSong) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <EditorSongView
          songId={selectedSong.id || selectedSong.songViewId}
          readOnly={true}
          theme={theme}
          tonicHz={tonicHz}
          onTonicChange={setTonicHz}
          onBack={handleBackFromSong}
        />
      </div>
    );
  }

  return null;
}
