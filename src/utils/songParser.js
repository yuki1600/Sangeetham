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
 * Given the entire JSON composition, build a flat list of aavartana rows.
 * Each row is exactly ONE aavartana (one || boundary).
 * Source tracking fields (sectionIdx, contentIdx, splitIdx) are included
 * so the editor can reconstruct the original composition after token edits.
 */
export function buildAavartanas(composition) {
    const rows = [];
    if (!composition) return rows;

    for (let sectionIdx = 0; sectionIdx < composition.length; sectionIdx++) {
        const section = composition[sectionIdx];
        for (let contentIdx = 0; contentIdx < section.content.length; contentIdx++) {
            const entry = section.content[contentIdx];
            const sahitya = entry.sahitya ?? '';
            const swaraParts = entry.swara.split('||').map(s => s.trim()).filter(Boolean);
            const sahityaParts = sahitya.split('||').map(s => s.trim()).filter(Boolean);
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
 */
export function buildContentRows(composition) {
    const rows = [];
    if (!composition) return rows;
    for (let sectionIdx = 0; sectionIdx < composition.length; sectionIdx++) {
        const section = composition[sectionIdx];
        for (let contentIdx = 0; contentIdx < (section.content || []).length; contentIdx++) {
            const entry = section.content[contentIdx];
            rows.push({
                section: section.section,
                swara: entry.swara || '',
                sahitya: entry.sahitya || '',
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
