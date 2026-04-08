import { TALA_TEMPLATES } from './talaTemplates';

/**
 * Parse a tala template string into its anga structure.
 *
 * Tala templates use `_` for beats, `|` to separate angas (groups), and `||`
 * to mark the end of one āvartana. Examples:
 *   "Adi"        → "_ _ _ _ | _ _ | _ _ ||"        →  4 + 2 + 2 = 8 beats
 *   "Rupakam"    → "_ _ | _ _ _ _ ||"               →  2 + 4 = 6 beats
 *   "Misra Chapu"→ "_ _ _ | _ _ | _ _ ||"           →  3 + 2 + 2 = 7 beats
 *
 * Returns null if the tala is unknown.
 *
 * @param {string} talaName
 * @returns {{ totalBeats: number, angas: number[] } | null}
 */
export function parseTalaBeats(talaName) {
    if (!talaName) return null;
    const template = TALA_TEMPLATES[talaName];
    if (!template) return null;

    // Strip the trailing `||` (end-of-āvartana marker), then split on the
    // remaining `|` markers — each piece is one anga.
    const cleaned = template.replace(/\|\|/g, '').trim();
    const angas = cleaned
        .split('|')
        .map(piece => (piece.match(/_/g) || []).length)
        .filter(n => n > 0);

    const totalBeats = angas.reduce((a, b) => a + b, 0);
    if (totalBeats === 0) return null;

    return { totalBeats, angas };
}

/**
 * Compute which beat (1-indexed) is currently active given a playback time
 * and the calibrated āvartana duration. Wraps around at the end of each
 * āvartana so the beat counter is always 1..totalBeats.
 *
 * `startTime` is the offset (in seconds) where the metronome should treat
 * beat 1 of the first āvartana as starting. This is the user's Pallavi
 * section cue — anything in the audio before that is treated as a lead-in
 * and the counter sits on beat 1 (returns 1).
 *
 * @param {number} currentTime         seconds since song start
 * @param {number} aavartanaSec        seconds per āvartana (calibrated)
 * @param {number} totalBeats          beats per āvartana (from parseTalaBeats)
 * @param {number} [startTime=0]       seconds offset where beat 1 begins
 * @returns {number}                   1-indexed current beat
 */
export function currentBeat(currentTime, aavartanaSec, totalBeats, startTime = 0) {
    if (!aavartanaSec || aavartanaSec <= 0 || !totalBeats) return 1;
    const t = currentTime - startTime;
    if (t < 0) return 1;
    const secondsPerBeat = aavartanaSec / totalBeats;
    const beatIdx = Math.floor(t / secondsPerBeat) % totalBeats;
    return beatIdx + 1;
}
