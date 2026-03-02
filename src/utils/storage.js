/**
 * LocalStorage helpers for practice session persistence.
 */

const STORAGE_KEY = 'sangeetha_practice_history';

/**
 * Save a practice result.
 */
export function savePracticeResult(result) {
    const history = getPracticeHistory();
    history.push({
        ...result,
        date: new Date().toISOString(),
    });
    // Keep last 50 sessions
    const trimmed = history.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Get practice history.
 * @returns {Array}
 */
export function getPracticeHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Get total practice time in seconds.
 */
export function getTotalPracticeTime() {
    const history = getPracticeHistory();
    return history.reduce((sum, r) => sum + (r.durationSec || 0), 0);
}

/**
 * Get best accuracy for an exercise.
 */
export function getBestAccuracy(exerciseId) {
    const history = getPracticeHistory();
    const matching = history.filter(r => r.exerciseId === exerciseId);
    if (matching.length === 0) return null;
    return Math.max(...matching.map(r => r.accuracy));
}
