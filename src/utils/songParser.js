/**
 * Parse a swara/sahityam string into an array of tokens.
 * Each token: { text, isSeparator, isDouble, octave }
 */
export function parseNotation(str) {
    if (!str) return [];
    const raw = str.replace(/\|\|/g, ' DBLBAR ').replace(/\|/g, ' BAR ');
    return raw.split(/\s+/).filter(Boolean).map(tok => {
        if (tok === 'DBLBAR') return { text: '||', isSeparator: true, isDouble: true };
        if (tok === 'BAR') return { text: '|', isSeparator: true, isDouble: false };

        let text = tok;
        let octave = null;
        if (text.startsWith('.')) {
            octave = 'lower';
            text = text.substring(1);
        } else if (text.endsWith('.')) {
            octave = 'higher';
            text = text.substring(0, text.length - 1);
        }
        return { text, isSeparator: false, isDouble: false, octave };
    });
}

/**
 * Convert a token array back to a notation string.
 * Strips trailing || (aavartana-end marker added by buildAavartanas).
 */
export function rejoinTokens(tokens) {
    // Strip trailing || that buildAavartanas appended
    const partTokens = tokens[tokens.length - 1]?.isDouble
        ? tokens.slice(0, -1)
        : tokens;

    return partTokens.map(tok => {
        if (tok.isSeparator) return tok.isDouble ? '||' : '|';
        if (tok.octave === 'lower') return '.' + tok.text;
        if (tok.octave === 'higher') return tok.text + '.';
        return tok.text;
    }).join(' ');
}

/**
 * Split a notation string on the aavartana boundary (`||`) and trim each segment.
 * Drops empty segments so trailing `||` or stray whitespace doesn't add a blank avartana.
 */
function splitOnAvartana(str) {
    if (!str) return [];
    return str.split('||').map(s => s.trim()).filter(Boolean);
}

/**
 * True when a notation string contains nothing meaningful — only template
 * placeholder characters (`_`, `|`, `||`, whitespace, `;`, `,`, `.`).
 * Used to skip calibration-padding rows when building display data.
 */
const PLACEHOLDER_RE = /^[\s_|;,.]*$/;
export function isPlaceholderText(str) {
    return PLACEHOLDER_RE.test(str || '');
}

/**
 * True when an entire content entry is just calibration padding — both
 * the swara and sahitya sides are empty / placeholder.
 */
export function isEmptyEntry(entry) {
    return isPlaceholderText(entry?.swara) && isPlaceholderText(entry?.sahitya);
}

/**
 * Take a swara and sahitya string and produce two parallel token arrays
 * with bar markers (`|`, `||`) at IDENTICAL indices in both. Used by the
 * notation lanes to render text mode as a fixed-width grid where the bar
 * markers and the corresponding swara/sahitya tokens line up vertically
 * between the two lanes.
 *
 * Algorithm:
 *   1. Tokenize each side as `aavartana[ ]subSegment[ ]note`
 *      (split on `||` then `|` then whitespace).
 *   2. Walk both shapes in lock-step. For each sub-segment, take
 *      max(swaraNotes, sahityaNotes) cells; pad the shorter side with
 *      empty cells. Insert single bar markers between sub-segments and
 *      double bar markers between aavartanas.
 *
 * Result: two arrays of {type:'note'|'bar', text, isDouble?} of identical
 * length, with bar markers at matching indices.
 */
export function alignContentRow(swaraStr, sahityaStr) {
    const tokenize = (str) =>
        (str || '')
            .split('||')
            .map(s => s.trim())
            .filter(Boolean)
            .map(av => av.split('|').map(sub => sub.trim().split(/\s+/).filter(Boolean)));

    const sw = tokenize(swaraStr);
    const sa = tokenize(sahityaStr);
    const aavCount = Math.max(sw.length, sa.length);

    // When the two sides have a different number of sub-segments inside the
    // same aavartana (e.g. swara has internal `|` markers but sahitya doesn't),
    // redistribute the side with fewer subs proportionally across the side
    // with more subs. This prevents the lane that has no `|` markers from
    // dumping all its tokens into sub 0 and leaving the remaining subs empty,
    // which previously produced large visual gaps in the rendered lane.
    const redistribute = (subs, targetSubCount, targetSizes) => {
        if (subs.length === targetSubCount) return subs;
        // Flatten and re-split proportionally to targetSizes.
        const flat = subs.reduce((acc, s) => acc.concat(s), []);
        const totalTarget = targetSizes.reduce((a, b) => a + b, 0) || 1;
        const out = [];
        let cursor = 0;
        for (let i = 0; i < targetSubCount; i++) {
            // Last sub takes whatever's left so we never lose tokens to rounding.
            const size = i === targetSubCount - 1
                ? Math.max(0, flat.length - cursor)
                : Math.round(flat.length * (targetSizes[i] / totalTarget));
            out.push(flat.slice(cursor, cursor + size));
            cursor += size;
        }
        return out;
    };

    const swOut = [];
    const saOut = [];

    for (let av = 0; av < aavCount; av++) {
        let swAv = sw[av] || [];
        let saAv = sa[av] || [];

        // Match sub-segment counts on both sides for proportional layout.
        if (swAv.length !== saAv.length && swAv.length > 0 && saAv.length > 0) {
            if (swAv.length > saAv.length) {
                const targetSizes = swAv.map(s => Math.max(1, s.length));
                saAv = redistribute(saAv, swAv.length, targetSizes);
            } else {
                const targetSizes = saAv.map(s => Math.max(1, s.length));
                swAv = redistribute(swAv, saAv.length, targetSizes);
            }
        }

        const subCount = Math.max(swAv.length, saAv.length, 1);

        // Spread `arr` (length N) evenly across `targetLen` slots so the
        // shorter lane visually aligns with the longer lane instead of all
        // its tokens piling up at the start of the sub-segment.
        const stretch = (arr, targetLen) => {
            const out = new Array(targetLen).fill('');
            if (!arr || arr.length === 0) return out;
            if (arr.length >= targetLen) {
                for (let i = 0; i < targetLen; i++) out[i] = arr[i] || '';
                return out;
            }
            if (arr.length === 1) { out[0] = arr[0]; return out; }
            // Place arr[i] at slot round(i * (targetLen - 1) / (arr.length - 1)).
            // The first note lands in slot 0 and the last in slot targetLen-1;
            // intermediate notes are spaced evenly.
            for (let i = 0; i < arr.length; i++) {
                const pos = Math.round((i * (targetLen - 1)) / (arr.length - 1));
                out[pos] = arr[i];
            }
            return out;
        };

        for (let sub = 0; sub < subCount; sub++) {
            const swSub = swAv[sub] || [];
            const saSub = saAv[sub] || [];
            const noteCount = Math.max(swSub.length, saSub.length, 1);

            const swStretched = stretch(swSub, noteCount);
            const saStretched = stretch(saSub, noteCount);

            for (let n = 0; n < noteCount; n++) {
                swOut.push({ type: 'note', text: swStretched[n] });
                saOut.push({ type: 'note', text: saStretched[n] });
            }

            // Single bar between sub-segments (within an aavartana)
            if (sub < subCount - 1) {
                swOut.push({ type: 'bar', text: '|' });
                saOut.push({ type: 'bar', text: '|' });
            }
        }

        // Double bar at the end of every aavartana
        swOut.push({ type: 'bar', text: '||', isDouble: true });
        saOut.push({ type: 'bar', text: '||', isDouble: true });
    }

    return { swara: swOut, sahitya: saOut };
}

/**
 * Given the entire JSON composition, build a flat list of aavartana rows.
 * Each row is exactly ONE aavartana (one || boundary).
 * Source tracking fields (sectionIdx, contentIdx, splitIdx) are included
 * so the editor can reconstruct the original composition after token edits.
 *
 * Calibration-padding entries (where both swara and sahitya are empty/
 * placeholder) are skipped — they exist in the underlying composition for
 * historical reasons but should never appear in the visible UI.
 */
export function buildAavartanas(composition) {
    const rows = [];
    if (!composition) return rows;

    for (let sectionIdx = 0; sectionIdx < composition.length; sectionIdx++) {
        const section = composition[sectionIdx];
        for (let contentIdx = 0; contentIdx < section.content.length; contentIdx++) {
            const entry = section.content[contentIdx];
            if (isEmptyEntry(entry)) continue;
            const swaraParts = splitOnAvartana(entry.swara ?? '');
            const sahityaParts = splitOnAvartana(entry.sahitya ?? '');
            const count = Math.max(swaraParts.length, sahityaParts.length);

            for (let splitIdx = 0; splitIdx < count; splitIdx++) {
                rows.push({
                    section: section.section,
                    swara: parseNotation((swaraParts[splitIdx] || '') + ((swaraParts[splitIdx]) ? ' ||' : '')),
                    sahitya: parseNotation((sahityaParts[splitIdx] || '') + ((sahityaParts[splitIdx]) ? ' ||' : '')),
                    // Source tracking for editor reconstruction
                    sectionIdx,
                    contentIdx,
                    splitIdx,
                    totalSplits: count,
                });
            }
        }
    }
    return rows;
}

/**
 * Build a flat list of content rows (one per composition content entry).
 * Unlike buildAavartanas which splits on ||, this keeps the full text intact.
 * Used for text-mode display where each row scrolls as a unit.
 *
 * Each row carries the raw `swara` / `sahitya` strings and an `avCount`
 * derived from the larger lane's `||` count. The notation lanes tokenize
 * each side independently and spread its tokens across the row's full
 * width, so the two lanes never fight each other for cell positions —
 * fine-grained alignment is the lyrics editor's responsibility.
 *
 * Calibration-padding entries are skipped, same as buildAavartanas.
 */
export function buildContentRows(composition) {
    const rows = [];
    if (!composition) return rows;
    for (let sectionIdx = 0; sectionIdx < composition.length; sectionIdx++) {
        const section = composition[sectionIdx];
        for (let contentIdx = 0; contentIdx < (section.content || []).length; contentIdx++) {
            const entry = section.content[contentIdx];
            if (isEmptyEntry(entry)) continue;
            const swaraAvs = splitOnAvartana(entry.swara).length;
            const sahityaAvs = splitOnAvartana(entry.sahitya).length;
            const avCount = Math.max(1, swaraAvs, sahityaAvs);

            rows.push({
                section: section.section,
                swara: entry.swara || '',
                sahitya: entry.sahitya || '',
                avCount,
                sectionIdx,
                contentIdx,
            });
        }
    }
    return rows;
}

/**
 * Given updated token text for one aavartana row, rebuild the full composition.
 * @param {Array} composition - current composition array
 * @param {Array} aavartanas - current flat aavartana rows (with source tracking)
 * @param {number} avIdx - which aavartana row was edited
 * @param {number} tokIdx - which token index was edited
 * @param {'swara'|'sahitya'} field
 * @param {string} newText - new token text
 * @returns {Array} new composition (deep clone with update applied)
 */
export function applyTokenEdit(composition, aavartanas, avIdx, tokIdx, field, newText) {
    const row = aavartanas[avIdx];
    const { sectionIdx, contentIdx, splitIdx } = row;
    const key = field === 'swara' ? 'swara' : 'sahitya';

    const newComp = structuredClone(composition);
    const entry = newComp[sectionIdx].content[contentIdx];

    // Get all splits for this content entry
    const allParts = (entry[key] || '').split('||').map(s => s.trim());

    // Get current tokens for this specific split (from aavartanas, not re-parsing)
    const currentTokens = field === 'swara' ? [...row.swara] : [...row.sahitya];
    // Update the edited token
    currentTokens[tokIdx] = { ...currentTokens[tokIdx], text: newText };

    // Convert tokens back to a part string (without trailing ||)
    const newPartStr = rejoinTokens(currentTokens);

    // Pad allParts if needed
    while (allParts.length <= splitIdx) allParts.push('');
    allParts[splitIdx] = newPartStr;

    entry[key] = allParts.filter(Boolean).join(' || ');
    return newComp;
}
