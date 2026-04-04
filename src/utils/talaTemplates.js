/**
 * Tala specific notation templates with standard bar-line markers.
 * These are used as 'blank canvases' for manually setup songs.
 */
export const TALA_TEMPLATES = {
    'Adi': '_ _ _ _ | _ _ | _ _ ||',
    'Rupakam': '_ _ | _ _ _ _ ||',
    'Khanda Chapu': '_ _ _ _ _ ||',
    'Misra Chapu': '_ _ _ _ _ _ _ ||',
    'Triputa': '_ _ _ | _ _ | _ _ ||',
    'Jhampa': '_ _ _ _ _ _ _ | _ | _ _ ||',
};

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
 * @param {string} title 
 * @param {string} tala 
 * @param {Array<string>} sections 
 * @returns {Object}
 */
export function generateCompositionTemplate(title, tala, sections) {
    const template = TALA_TEMPLATES[tala] || '_ _ _ _ ||';
    
    const composition = sections.map(sectionName => ({
        section: sectionName,
        content: [
            {
                swaram: template,
                sahityam: template
            }
        ]
    }));

    return {
        song_details: {
            title,
            tala,
            raga: '',
            composer: '',
            compositionType: 'Kriti'
        },
        composition
    };
}
