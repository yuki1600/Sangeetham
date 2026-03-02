import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ShrutiSelector from './components/ShrutiSelector';
import DronePlayer from './components/DronePlayer';
import LivePitchMonitor from './components/LivePitchMonitor';
import LessonsPanel from './components/LessonsPanel';
import SongBrowser from './components/SongBrowser';
import SongMode from './components/SongMode';
import ExerciseRunner from './components/ExerciseRunner';
import FeedbackSummary from './components/FeedbackSummary';
import { TONIC_PRESETS } from './utils/swaraUtils';
import { EXERCISES } from './utils/exercises';
import { ChevronRight, Music2 } from 'lucide-react';

/**
 * Main application — routes between home, song-browser, practicing, and feedback views.
 */
export default function App() {
  const [view, setView] = useState('home'); // home | song-mode | song-browser | practicing | feedback
  const [tonicHz, setTonicHz] = useState(TONIC_PRESETS[0].hz);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseResults, setExerciseResults] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
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
    setSelectedSong(null);
    setView('home');
  }, []);

  const handleOpenSongMode = useCallback((songId) => {
    setSelectedSong(songId);
    setView('song-mode');
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

            {/* ── Song Mode entry card ──────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1 px-1">
                Songs
              </h3>

              {/* Mathe Malayadwaja */}
              <button
                onClick={() => handleOpenSongMode('mathe')}
                className="w-full group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] p-4 text-left transition-all duration-300 hover:border-violet-500/30 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/8 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Music2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-violet-400 transition-colors">
                        Mathe Malayadwaja
                      </h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 flex-shrink-0">
                        Song Mode
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      Khamas · Adi (Vilamba) · Muttaiah Bhagavatar
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </button>

              {/* Lambodhara */}
              <button
                onClick={() => handleOpenSongMode('lambodhara')}
                className="w-full group relative overflow-hidden rounded-2xl border border-[var(--glass-border)] p-4 text-left transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Music2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                        Lambodhara Lakumikara
                      </h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        Song Mode
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      Malahari · Rupakam · Purandaradasa
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </button>
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

  // Song Mode view
  if (view === 'song-mode') {
    return (
      <div className="h-full bg-[var(--bg-primary)]">
        <SongMode
          theme={theme}
          tonicHz={tonicHz}
          onBack={handleHome}
          onTonicChange={setTonicHz}
          songId={selectedSong}
        />
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
