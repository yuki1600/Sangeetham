import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ShrutiSelector from './components/ShrutiSelector';
import DronePlayer from './components/DronePlayer';
import LivePitchMonitor from './components/LivePitchMonitor';
import LessonsPanel from './components/LessonsPanel';
import SongBrowser from './components/SongBrowser';
import ExerciseRunner from './components/ExerciseRunner';
import FeedbackSummary from './components/FeedbackSummary';
import { TONIC_PRESETS } from './utils/swaraUtils';
import { EXERCISES } from './utils/exercises';

/**
 * Main application — routes between home, song-browser, practicing, and feedback views.
 */
export default function App() {
  const [view, setView] = useState('home'); // home | song-browser | practicing | feedback
  const [tonicHz, setTonicHz] = useState(TONIC_PRESETS[0].hz);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseResults, setExerciseResults] = useState(null);
  const [theme, setTheme] = useState('light');
  const [browsedGroupId, setBrowsedGroupId] = useState(null);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

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

  // Song selected from browser — find linked exercise or launch sandbox
  const handleSelectSong = useCallback((song) => {
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
    setView('home');
  }, []);

  // Home view
  if (view === 'home') {
    return (
      <div className="h-full flex flex-col overflow-y-auto">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />

        <main className="flex-1 px-6 pb-8 max-w-2xl mx-auto w-full">
          <div className="grid gap-5 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-5">
                <ShrutiSelector selectedTonic={tonicHz} onSelect={setTonicHz} />
                <DronePlayer tonicHz={tonicHz} />
              </div>
              <LivePitchMonitor tonicHz={tonicHz} theme={theme} />
            </div>
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
        />
        <main className="flex-1 px-6 pb-8 max-w-2xl mx-auto w-full">
          <SongBrowser
            groupId={browsedGroupId}
            onBack={handleHome}
            onSelectSong={handleSelectSong}
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

  return null;
}
