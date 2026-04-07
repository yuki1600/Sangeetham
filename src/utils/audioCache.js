/**
 * Session-scoped caches for the song editor.
 *
 * - audioCache stores decoded AudioBuffer objects, keyed by `${songId}-${type}`,
 *   so navigating away and back to a song does not re-decode the audio.
 * - songDataCache stores fetched song metadata + composition, keyed by songId,
 *   so reopening the same song is instant.
 *
 * These are intentionally module-level singletons. They must NOT be moved
 * inside a hook — every consumer needs to share the same Map instance.
 */
export const audioCache = new Map();
export const songDataCache = new Map();
