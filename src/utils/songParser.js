/**
 * songParser.js
 * Parses a Carnatic composition JSON into a flat, indexed token array
 * suitable for the piano-tiles Song Mode renderer.
 *
 * Token types:
 *   'section_start' – { type, section, contentIndex, noteIdxAtPoint }
 *   'barline'       – { type, double, noteIdxAtPoint }
 *   'note'          – { type, swaram, sahityam, isContinuation, section, color, noteIdx }
 *   'rest'          – { type, swaram, sahityam, isContinuation, section, color, noteIdx }
 */

// ── Swaram color palette (keyed on first letter) ─────────────────────────────
const SWARA_COLORS = {
    S: '#10b981', // emerald – Sa / S'
    R: '#3b82f6', // blue    – Ri / R'
    G: '#f59e0b', // amber   – Ga / G'
    M: '#f97316', // orange  – Ma / M'
    P: '#8b5cf6', // violet  – Pa
    D: '#ec4899', // pink    – Da / D'
    N: '#f43f5e', // rose    – Ni / N'
};

const REST_COLOR = '#4b5563'; // slate-600

export const SWARA_COLOR_LIST = Object.values(SWARA_COLORS);

export function getSwaramColor(sw) {
    if (!sw) return REST_COLOR;
    const first = sw.charAt(0).toUpperCase();
    return SWARA_COLORS[first] ?? REST_COLOR;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BAR_MARKERS = new Set(['|', '||']);
const REST_TOKENS = new Set([';', ',']);
// Numeric prefixes like "1.", "2." that appear in some swaram lines
const MEASURE_NUM_RE = /^\d+\.$/;

function tokenizeLine(str) {
    if (!str) return [];
    return str.trim().split(/\s+/).filter(t => t && !MEASURE_NUM_RE.test(t));
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * parseSongJson(json)
 *
 * @param {object} json – Raw composition JSON object
 * @returns {{ tokens: Token[], noteCount: number }}
 *   tokens    – flat array of all tokens (see type definitions above)
 *   noteCount – total number of note/rest tokens (used for timing calculations)
 */
export function parseSongJson(json) {
    const tokens = [];
    let noteIdx = 0;

    for (const section of json.composition) {
        for (let ci = 0; ci < section.content.length; ci++) {
            const content = section.content[ci];
            if (!content.swaram) continue;

            // ── Section boundary marker ───────────────────────────────────────
            tokens.push({
                type: 'section_start',
                section: section.section,
                contentIndex: ci,
                noteIdxAtPoint: noteIdx,
            });

            const swToks = tokenizeLine(content.swaram);
            // Prefer sahityam; Chittaswara blocks sometimes only have jati fields
            const rawSah = content.sahityam ?? '';
            const sahToks = tokenizeLine(rawSah);

            // ── Process swaram + sahityam together ────────────────────────────
            // Both strings have bar markers at exactly the same token positions,
            // so we can walk a single sahityam index alongside the swaram index.
            let si = 0; // sahityam cursor

            for (const sw of swToks) {
                // ── Bar markers ───────────────────────────────────────────────
                if (BAR_MARKERS.has(sw)) {
                    tokens.push({
                        type: 'barline',
                        double: sw === '||',
                        noteIdxAtPoint: noteIdx,
                    });
                    // Advance sahityam past its matching bar marker
                    if (si < sahToks.length && BAR_MARKERS.has(sahToks[si])) si++;
                    continue;
                }

                // ── Read sahityam token ───────────────────────────────────────
                let sah = si < sahToks.length ? sahToks[si] : '';
                // Don't consume a sahityam bar marker as a syllable
                if (BAR_MARKERS.has(sah)) sah = '';
                else si++;

                const isContinuation = sah === '.';
                const isRest = REST_TOKENS.has(sw);

                tokens.push({
                    type: isRest ? 'rest' : 'note',
                    swaram: sw,
                    sahityam: isContinuation ? '' : sah,
                    isContinuation,
                    section: section.section,
                    color: getSwaramColor(sw),
                    noteIdx,
                });
                noteIdx++;
            }
        }
    }

    return { tokens, noteCount: noteIdx };
}
