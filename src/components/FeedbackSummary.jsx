import React from 'react';
import { Star, Smile, TrendingUp, Target } from 'lucide-react';
import { savePracticeResult } from '../utils/storage';

/**
 * Feedback summary shown after exercise completion.
 * Displays accuracy, per-note breakdown, and duration.
 */
export default function FeedbackSummary({ results, theme, onRetry, onHome }) {
    const { exerciseName, accuracy, noteResults, durationSec } = results;

    // Save to history
    React.useEffect(() => {
        savePracticeResult(results);
    }, [results]);

    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    // Determine grade
    let grade, gradeColor, GradeIcon;
    if (accuracy >= 80) {
        grade = 'Excellent';
        gradeColor = 'text-emerald-400';
        GradeIcon = <Star className="w-12 h-12 text-emerald-400 mx-auto" />;
    } else if (accuracy >= 60) {
        grade = 'Good';
        gradeColor = 'text-yellow-400';
        GradeIcon = <Smile className="w-12 h-12 text-yellow-400 mx-auto" />;
    } else if (accuracy >= 40) {
        grade = 'Keep Practicing';
        gradeColor = 'text-orange-400';
        GradeIcon = <TrendingUp className="w-12 h-12 text-orange-400 mx-auto" />;
    } else {
        grade = 'Try Again';
        gradeColor = 'text-red-400';
        GradeIcon = <Target className="w-12 h-12 text-red-400 mx-auto" />;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 fade-in">
            <div className="glass-card p-8 max-w-lg w-full text-center">
                {/* Grade Icon */}
                <div className="mb-4">{GradeIcon}</div>
                <h2 className={`text-2xl font-bold ${gradeColor} mb-1`}>{grade}</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">{exerciseName}</p>

                {/* Big accuracy circle */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        {/* Background circle */}
                        <circle
                            cx="70" cy="70" r="60"
                            fill="none"
                            stroke="rgba(128,128,128,0.15)"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="70" cy="70" r="60"
                            fill="none"
                            stroke={accuracy >= 80 ? '#00e676' : accuracy >= 60 ? '#ffca28' : '#ff5252'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(accuracy / 100) * 377} 377`}
                            transform="rotate(-90 70 70)"
                            style={{ transition: 'stroke-dasharray 1s ease-out' }}
                        />
                    </svg>
                    <div className="absolute text-center">
                        <div className="text-3xl font-bold">{accuracy}%</div>
                        <div className="text-xs text-[var(--text-muted)]">Accuracy</div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-xl font-semibold text-[var(--text-primary)]">
                            {noteResults.filter(n => n.hit).length}/{noteResults.length}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Notes Hit</div>
                    </div>
                    <div className="w-px bg-[var(--glass-border)]" />
                    <div className="text-center">
                        <div className="text-xl font-semibold text-[var(--text-primary)]">
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Duration</div>
                    </div>
                </div>

                {/* Per-note breakdown */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {noteResults.map((note, i) => (
                        <div
                            key={i}
                            className={`
                px-3 py-1.5 rounded-lg text-sm font-medium
                ${note.hit
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/15 text-red-400'
                                }
              `}
                            title={`${note.accuracy}% accurate`}
                        >
                            {note.swara}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <button onClick={onRetry} className="btn-primary">
                        Try Again
                    </button>
                    <button onClick={onHome} className="btn-secondary">
                        Home
                    </button>
                </div>
            </div>
        </div>
    );
}
