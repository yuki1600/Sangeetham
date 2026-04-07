// Carnatic swara definitions — 12 semitone positions relative to Sa
// Using standard equal-temperament ratios

const SWARA_RATIOS = [
    { name: 'Sa', ratio: 1.0, semitone: 0 },
    { name: 'Ri₁', ratio: 16 / 15, semitone: 1 },
    { name: 'Ri₂', ratio: 9 / 8, semitone: 2 },
    { name: 'Ga₂', ratio: 6 / 5, semitone: 3 },
    { name: 'Ga₃', ratio: 5 / 4, semitone: 4 },
    { name: 'Ma₁', ratio: 4 / 3, semitone: 5 },
    { name: 'Ma₂', ratio: 45 / 32, semitone: 6 },
    { name: 'Pa', ratio: 3 / 2, semitone: 7 },
    { name: 'Da₁', ratio: 8 / 5, semitone: 8 },
    { name: 'Da₂', ratio: 5 / 3, semitone: 9 },
    { name: 'Ni₂', ratio: 9 / 5, semitone: 10 },
    { name: 'Ni₃', ratio: 15 / 8, semitone: 11 },
    { name: 'Ṡa', ratio: 2.0, semitone: 12 },
];

// Simple display names for exercises and UI
const SWARA_SIMPLE = ['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Da', 'Ni', 'Ṡa'];
const SWARA_SIMPLE_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];

// Tonic presets (note name → Hz)
export const TONIC_PRESETS = [
    { name: 'C', hz: 130.81 },
    { name: 'C#', hz: 138.59 },
    { name: 'D', hz: 146.83 },
    { name: 'D#', hz: 155.56 },
    { name: 'E', hz: 164.81 },
    { name: 'F', hz: 174.61 },
    { name: 'F#', hz: 185.00 },
    { name: 'G', hz: 196.00 },
    { name: 'G#', hz: 207.65 },
    { name: 'A', hz: 220.00 },
    { name: 'A#', hz: 233.08 },
    { name: 'B', hz: 246.94 },
];

/**
 * Convert frequency to cents relative to tonic.
 * @param {number} hz - Detected frequency
 * @param {number} tonicHz - Sa frequency
 * @returns {number} Cents from Sa (0 = Sa, 1200 = Ṡa)
 */
export function hzToCents(hz, tonicHz) {
    if (!hz || !tonicHz || hz <= 0 || tonicHz <= 0) return null;
    return 1200 * Math.log2(hz / tonicHz);
}

/**
 * Find nearest swara for a given frequency.
 * @param {number} hz - Detected frequency
 * @param {number} tonicHz - Sa frequency
 * @returns {{ swara: string, cents: number, deviation: number, color: string, swaraIndex: number }}
 */
export function hzToSwara(hz, tonicHz) {
    if (!hz || !tonicHz) return null;

    const cents = hzToCents(hz, tonicHz);
    if (cents === null) return null;

    // Normalize cents to 0–1200 range (within one octave)
    let normalizedCents = ((cents % 1200) + 1200) % 1200;

    let bestIdx = 0;
    let bestDev = Infinity;

    for (let i = 0; i < SWARA_RATIOS.length; i++) {
        const swaraCents = 1200 * Math.log2(SWARA_RATIOS[i].ratio);
        let dev = normalizedCents - swaraCents;

        // Handle wrap-around at octave boundary
        if (dev > 600) dev -= 1200;
        if (dev < -600) dev += 1200;

        if (Math.abs(dev) < Math.abs(bestDev)) {
            bestDev = dev;
            bestIdx = i;
        }
    }

    return {
        swara: SWARA_RATIOS[bestIdx].name,
        cents: normalizedCents,
        deviation: bestDev,
        color: getSwaraColor(bestDev),
        swaraIndex: bestIdx,
    };
}

/**
 * Get swara frequency given tonic.
 */
export function swaraToHz(swaraName, tonicHz) {
    const swara = SWARA_RATIOS.find(s => s.name === swaraName);
    if (!swara) return null;
    return tonicHz * swara.ratio;
}

/**
 * Get simple swara frequency
 */
export function simpleSwaraToHz(swaraName, tonicHz) {
    const idx = SWARA_SIMPLE.indexOf(swaraName);
    if (idx === -1) return null;
    return tonicHz * SWARA_SIMPLE_RATIOS[idx];
}

/**
 * Color based on pitch deviation.
 * Green = perfect (±15¢), Yellow = good (±35¢), Red = off (>35¢)
 */
export function getSwaraColor(deviation) {
    const absDev = Math.abs(deviation);
    if (absDev <= 15) return '#00e676'; // green
    if (absDev <= 35) return '#ffca28'; // yellow
    return '#ff5252'; // red
}

/**
 * Tailwind class equivalent of getSwaraColor — used by pitch displays
 * (CompactPitchBar, TonicBar, ExerciseRunner) that style with utility classes.
 */
export function getPitchColorClass(deviation) {
    const absDev = Math.abs(deviation);
    if (absDev <= 15) return 'text-emerald-400';
    if (absDev <= 35) return 'text-yellow-400';
    return 'text-red-400';
}

/**
 * Get all swara frequencies for one octave given a tonic.
 */
export function getSwaraScale(tonicHz) {
    return SWARA_RATIOS.map(s => ({
        name: s.name,
        hz: tonicHz * s.ratio,
        cents: 1200 * Math.log2(s.ratio),
    }));
}

export { SWARA_RATIOS, SWARA_SIMPLE };
