/**
 * Tala specific notation templates with standard bar-line markers.
 * These are used as 'blank canvases' for manually setup songs.
 */
export const TALA_TEMPLATES = {
    "Adi": "_ _ _ _ | _ _ | _ _ ||",
    "Rupakam": "_ _ | _ _ _ _ ||",
    "Deshadi": "_ _ _ _ ||",
    "Madhyadi": "_ _ _ _ ||",
    "Khanda Chapu": "_ _ _ _ _ ||",
    "Misra Chapu": "_ _ _ _ _ _ _ ||",
    "Dhruva Talam": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
    "Dhruva": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
    "Tisra Dhruva": "_ _ _ | _ _ | _ _ _ | _ _ _ ||",
    "Chatusra Dhruva": "_ _ _ _ | _ _ | _ _ _ _ | _ _ _ _ ||",
    "Khanda Dhruva": "_ _ _ _ _ | _ _ | _ _ _ _ _ | _ _ _ _ _ ||",
    "Misra Dhruva": "_ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ | _ _ _ _ _ _ _ ||",
    "Sankeerna Dhruva": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _ _ ||",
    "Matya Talam": "_ _ _ _ | _ _ | _ _ _ _ ||",
    "Matya": "_ _ _ _ | _ _ | _ _ _ _ ||",
    "Tisra Matya": "_ _ _ | _ _ | _ _ _ ||",
    "Chatusra Matya": "_ _ _ _ | _ _ | _ _ _ _ ||",
    "Khanda Matya": "_ _ _ _ _ | _ _ | _ _ _ _ _ ||",
    "Misra Matya": "_ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ ||",
    "Sankeerna Matya": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ _ _ _ _ _ _ _ ||",
    "Rupaka Talam": "_ _ | _ _ _ _ ||",
    "Rupaka": "_ _ | _ _ _ _ ||",
    "Tisra Rupaka": "_ _ | _ _ _ ||",
    "Chatusra Rupaka": "_ _ | _ _ _ _ ||",
    "Khanda Rupaka": "_ _ | _ _ _ _ _ ||",
    "Misra Rupaka": "_ _ | _ _ _ _ _ _ _ ||",
    "Sankeerna Rupaka": "_ _ | _ _ _ _ _ _ _ _ _ ||",
    "Jhampa Talam": "_ _ _ _ _ _ _ | _ | _ _ ||",
    "Jhampa": "_ _ _ _ _ _ _ | _ | _ _ ||",
    "Tisra Jhampa": "_ _ _ | _ | _ _ ||",
    "Chatusra Jhampa": "_ _ _ _ | _ | _ _ ||",
    "Khanda Jhampa": "_ _ _ _ _ | _ | _ _ ||",
    "Misra Jhampa": "_ _ _ _ _ _ _ | _ | _ _ ||",
    "Sankeerna Jhampa": "_ _ _ _ _ _ _ _ _ | _ | _ _ ||",
    "Triputa Talam": "_ _ _ | _ _ | _ _ ||",
    "Triputa": "_ _ _ | _ _ | _ _ ||",
    "Tisra Triputa": "_ _ _ | _ _ | _ _ ||",
    "Chatusra Triputa": "_ _ _ _ | _ _ | _ _ ||",
    "Khanda Triputa": "_ _ _ _ _ | _ _ | _ _ ||",
    "Misra Triputa": "_ _ _ _ _ _ _ | _ _ | _ _ ||",
    "Sankeerna Triputa": "_ _ _ _ _ _ _ _ _ | _ _ | _ _ ||",
    "Ata Talam": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
    "Ata": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
    "Tisra Ata": "_ _ _ | _ _ _ | _ _ | _ _ ||",
    "Chatusra Ata": "_ _ _ _ | _ _ _ _ | _ _ | _ _ ||",
    "Khanda Ata": "_ _ _ _ _ | _ _ _ _ _ | _ _ | _ _ ||",
    "Misra Ata": "_ _ _ _ _ _ _ | _ _ _ _ _ _ _ | _ _ | _ _ ||",
    "Sankeerna Ata": "_ _ _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _ _ | _ _ | _ _ ||",
    "Eka Talam": "_ _ _ _ ||",
    "Eka": "_ _ _ _ ||",
    "Tisra Eka": "_ _ _ ||",
    "Chatusra Eka": "_ _ _ _ ||",
    "Khanda Eka": "_ _ _ _ _ ||",
    "Misra Eka": "_ _ _ _ _ _ _ ||",
    "Sankeerna Eka": "_ _ _ _ _ _ _ _ _ ||"
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
export function generateCompositionTemplate(title, tala, sections, raga = '', composer = '') {
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
            raga,
            composer,
            compositionType: 'Kriti'
        },
        composition
    };
}
