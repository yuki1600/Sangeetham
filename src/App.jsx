import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import TonicBar from './components/TonicBar';
import LessonsPanel from './components/LessonsPanel';
import SongBrowser from './components/SongBrowser';
import ExerciseRunner from './components/ExerciseRunner';
import FeedbackSummary from './components/FeedbackSummary';
import SongsPanel from './components/SongsPanel';
import SongEditor from './components/editor/SongEditor';
import EditorSongView from './components/editor/EditorSongView';
import InfoModal from './components/InfoModal';
import { TONIC_PRESETS } from './utils/swaraUtils';
import { EXERCISES } from './utils/exercises';
import { ChevronRight, Music2 } from 'lucide-react';
import { resumeAudioContext } from './utils/audioEngine';
import { ErrorBoundary } from './ErrorBoundary';

/** Parse the URL hash into initial view state (supports refresh-to-restore). */
function parseHash() {
  const hash = window.location.hash.slice(1);
  if (hash === 'editor') return { view: 'editor' };
  if (hash.startsWith('editor-song/')) {
    const id = hash.slice('editor-song/'.length);
    if (id) return { view: 'editor-song', editorSongId: id };
    return { view: 'editor' };
  }
  if (hash.startsWith('song-view/')) {
    const id = hash.slice('song-view/'.length);
    if (id) return { view: 'song-view', songId: id };
    return { view: 'home' };
  }
  return { view: 'home' };
}

/**
 * Main application — routes between home, song-browser, practicing, and feedback views.
 */
function AppContent() {
  const _initial = parseHash();
  const [view, setView] = useState(_initial.view);
  const [tonicHz, setTonicHz] = useState(TONIC_PRESETS[0].hz);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseResults, setExerciseResults] = useState(null);
  const [theme, setTheme] = useState('light');
  const [browsedGroupId, setBrowsedGroupId] = useState(_initial.groupId || null);
  const [selectedSongId, setSelectedSongId] = useState(_initial.songId || _initial.editorSongId || null);
  const [editorBackTarget, setEditorBackTarget] = useState('editor'); // Where to go back from editor-song view
  const [showInfo, setShowInfo] = useState(false);

  // Global Interaction Listener (ensure audio context is resumed on first touch)
  useEffect(() => {
    const handleGesture = () => {
      resumeAudioContext();
    };
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(e => window.addEventListener(e, handleGesture, { once: true, passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleGesture));
  }, []);

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
    else if (view === 'editor-song' && selectedSongId) hash = `editor-song/${selectedSongId}`;
    else if (view === 'song-view' && selectedSongId) hash = `song-view/${selectedSongId}`;
    else if (view === 'song-browser' && browsedGroupId) hash = `song-browser/${browsedGroupId}`;
    // practicing / feedback are transient — refresh sends to home
    history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname);
  }, [view, selectedSongId, browsedGroupId]);

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
    if (song.songViewId || song.id) {
      setSelectedSongId(song.songViewId || song.id);
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
    setSelectedSongId(null);
    setView('home');
  }, []);

  const handleBackFromSong = useCallback(() => {
    setSelectedSongId(null);
    // Go back to song browser if we came from there
    if (browsedGroupId) {
      setView('song-browser');
    } else {
      setView('home');
    }
  }, [browsedGroupId]);

  const handleEditSong = useCallback((id, backTarget = 'editor') => {
    setSelectedSongId(id);
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

  if (view === 'editor-song' && selectedSongId) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <EditorSongView
          songId={selectedSongId}
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

        <main className="flex-1 px-6 pb-8 max-w-7xl mx-auto w-full">
          <div className="fade-in">
            {/* New Horizontal Tonic Bar on Top (Now with Live Pitch Monitor) */}
            <TonicBar 
              tonicHz={tonicHz} 
              onTonicChange={setTonicHz} 
              theme={theme} 
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Sidebar Column: Learning Path */}
              <div className="md:col-span-4 lg:col-span-3 sticky top-32">
                <LessonsPanel
                  onStartExercise={handleStartExercise}
                  onBrowse={handleBrowseGroup}
                />
              </div>

              {/* Main Column: Songs Gallery */}
              <div className="md:col-span-8 lg:col-span-9">
                <SongsPanel 
                  onSelectSong={handleSelectSong} 
                  onEditSong={(id) => handleEditSong(id, 'home')}
                  onViewAll={() => setView('editor')}
                />
              </div>
            </div>
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
          onEditor={() => setView('editor')}
          onInfo={() => setShowInfo(true)}
        />
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} theme={theme} />}
        <main className="flex-1 px-6 pb-8 max-w-6xl mx-auto w-full">
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
  if (view === 'song-view' && selectedSongId) {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <EditorSongView
          songId={selectedSongId}
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
