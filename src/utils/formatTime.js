/**
 * Format a duration in seconds as "M:SS".
 * Returns "0:00" for non-finite or negative inputs.
 */
export function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
}
