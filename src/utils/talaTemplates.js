/**
 * Tala specific notation templates with standard bar-line markers.
 * These are used as 'blank canvases' for manually setup songs.
 *
 * Source data lives in /shared/talaTemplates.json so the server
 * (server/routes/songs.js) and the client share a single source of truth.
 */
import templates from '../../shared/talaTemplates.json';
export const TALA_TEMPLATES = templates;

export const STANDARD_SECTIONS = [
    'Pallavi',
    'Anupallavi',
    'Charanam',
    'Chittaswaram',
    'Anucharanam',
    'Madhyama Kaalam',
];

/**
 * Generate a standard Sangeetha composition JSON object.
 * When audioDuration is provided, avartanas are distributed evenly across
 * sections so the notation covers the full length of the audio.
 *
 * @param {string} title
 * @param {string} tala
 * @param {Array<string>} sections
 * @param {string} raga
 * @param {string} composer
 * @param {number} [audioDuration] - audio length in seconds (optional)
 * @returns {Object}
 */
export function generateCompositionTemplate(title, tala, sections, raga = '', composer = '', audioDuration = 0) {
    const template = TALA_TEMPLATES[tala] || '_ _ _ _ ||';

    // Estimate a reasonable avartana duration (~4s default for Adi-like talas)
    const DEFAULT_AVARTANA_SEC = 4;
    const totalAvartanas = audioDuration > 0
        ? Math.max(sections.length, Math.ceil(audioDuration / DEFAULT_AVARTANA_SEC))
        : sections.length; // 1 per section when no duration info

    // Distribute avartanas evenly across sections
    const base = Math.floor(totalAvartanas / sections.length);
    let remainder = totalAvartanas - base * sections.length;

    const composition = sections.map(sectionName => {
        const count = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        const content = [];
        for (let i = 0; i < count; i++) {
            content.push({ swara: template, sahitya: template });
        }
        return { section: sectionName, content };
    });

    return {
        song_details: {
            title,
            tala,
            raga,
            composer,
            compositionType: 'Kriti'
        },
        composition
    };
}
