/**
 * Arohana / Avarohana for common Carnatic ragas.
 * Swaras use standard notation: S R1 R2 G1 G2 G3 M1 M2 P D1 D2 N1 N2 N3
 * Higher octave marked with . suffix (S.), lower octave with . prefix (.P)
 */
export const RAGA_SCALES = {
    'Abhogi':             { arohana: ['S', 'R2', 'G2', 'M1', 'D2', 'S.'], avarohana: ['S.', 'D2', 'M1', 'G2', 'R2', 'S'] },
    'Anandabhairavi':     { arohana: ['S', 'G2', 'R2', 'G2', 'M1', 'P', 'D2', 'P', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Arabhi':             { arohana: ['S', 'R2', 'M1', 'P', 'D2', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Asaveri':            { arohana: ['S', 'R2', 'M1', 'P', 'D1', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Atana':              { arohana: ['S', 'R2', 'M1', 'P', 'D2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Bhairavi':           { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Bilahari':           { arohana: ['S', 'R2', 'G3', 'P', 'D2', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Bowli':              { arohana: ['S', 'R1', 'G3', 'M1', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M1', 'G3', 'R1', 'S'] },
    'Brindavani':         { arohana: ['S', 'R2', 'G3', 'P', 'D2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'G3', 'R2', 'S'] },
    'Chakravakam':        { arohana: ['S', 'R1', 'G3', 'M1', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R1', 'S'] },
    'Chalanaata':         { arohana: ['S', 'R2', 'G3', 'M1', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Charukesi':          { arohana: ['S', 'R2', 'G3', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Darbar':             { arohana: ['S', 'R2', 'M1', 'P', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Dhanyasi':           { arohana: ['S', 'G2', 'M1', 'P', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R1', 'S'] },
    'Dharmavati':         { arohana: ['S', 'R2', 'G2', 'M2', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M2', 'G2', 'R2', 'S'] },
    'Gaurimanohari':      { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Gowlai':             { arohana: ['S', 'R1', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R1', 'S'] },
    'Hamsadhwani':        { arohana: ['S', 'R2', 'G3', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'P', 'G3', 'R2', 'S'] },
    'Hamsanadam':         { arohana: ['S', 'R2', 'M1', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'P', 'M1', 'R2', 'S'] },
    'Hari Kambodhi':      { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Hindolam':           { arohana: ['S', 'G2', 'M1', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'M1', 'G2', 'S'] },
    'Kalyani':            { arohana: ['S', 'R2', 'G3', 'M2', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M2', 'G3', 'R2', 'S'] },
    'Kambodhi':           { arohana: ['S', 'R2', 'G3', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Kamas':              { arohana: ['S', 'M1', 'G3', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Kanada':             { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Kapi':               { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Kedaragowla':        { arohana: ['S', 'R2', 'M1', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Keeravani':          { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Kharaharapriya':     { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Latangi':            { arohana: ['S', 'R2', 'G3', 'M2', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M2', 'G3', 'R2', 'S'] },
    'Madhyamavati':       { arohana: ['S', 'R2', 'M1', 'P', 'N2', 'S.'], avarohana: ['S.', 'N2', 'P', 'M1', 'R2', 'S'] },
    'Malahari':           { arohana: ['S', 'R1', 'M1', 'P', 'D1', 'S.'], avarohana: ['S.', 'D1', 'P', 'M1', 'G1', 'R1', 'S'] },
    'Mayamalavagowlai':   { arohana: ['S', 'R1', 'G3', 'M1', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M1', 'G3', 'R1', 'S'] },
    'Mohanam':            { arohana: ['S', 'R2', 'G3', 'P', 'D2', 'S.'], avarohana: ['S.', 'D2', 'P', 'G3', 'R2', 'S'] },
    'Mukhari':            { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Nalinakanthi':       { arohana: ['S', 'G3', 'R2', 'G3', 'M1', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Nattai':             { arohana: ['S', 'R1', 'G3', 'M1', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'P', 'M1', 'G3', 'R1', 'S'] },
    'Navaroj':            { arohana: ['S', 'R2', 'G3', 'M1', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'M1', 'G3', 'R2', 'S'] },
    'Pantuvarali':        { arohana: ['S', 'R1', 'G3', 'M2', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M2', 'G3', 'R1', 'S'] },
    'Poorvikalyani':      { arohana: ['S', 'R2', 'G3', 'M2', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M2', 'G3', 'R2', 'S'] },
    'Punnagavarali':      { arohana: ['S', 'R1', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R1', 'S'] },
    'Reethigowlai':       { arohana: ['S', 'G2', 'M1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'M1', 'G2', 'R1', 'S'] },
    'Revathi':            { arohana: ['S', 'R1', 'G2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G2', 'R1', 'S'] },
    'Saaranga':           { arohana: ['S', 'R2', 'M1', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'R2', 'G3', 'R2', 'S'] },
    'Sahana':             { arohana: ['S', 'R2', 'G3', 'M1', 'P', 'M1', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Sama':               { arohana: ['S', 'R2', 'G3', 'M2', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M2', 'G3', 'R2', 'S'] },
    'Saveri':             { arohana: ['S', 'R1', 'M1', 'P', 'D1', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M1', 'G3', 'R1', 'S'] },
    'Shankarabharanam':   { arohana: ['S', 'R2', 'G3', 'M1', 'P', 'D2', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Shanmukhapriya':     { arohana: ['S', 'R2', 'G2', 'M2', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M2', 'G2', 'R2', 'S'] },
    'Simhendramadhyamam': { arohana: ['S', 'R2', 'G2', 'M2', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M2', 'G2', 'R2', 'S'] },
    'Sindhu Bhairavi':    { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
    'Sri':                { arohana: ['S', 'R2', 'M1', 'P', 'N3', 'S.'], avarohana: ['S.', 'N3', 'P', 'D2', 'N3', 'P', 'M1', 'R2', 'G3', 'R2', 'S'] },
    'Sri Ranjani':        { arohana: ['S', 'R2', 'G2', 'M1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'M1', 'G2', 'R2', 'S'] },
    'Subhapantuvarali':   { arohana: ['S', 'R1', 'G2', 'M2', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M2', 'G2', 'R1', 'S'] },
    'Suddha Dhanyasi':    { arohana: ['S', 'G2', 'M1', 'P', 'N2', 'S.'], avarohana: ['S.', 'N2', 'P', 'M1', 'G2', 'S'] },
    'Suddha Saveri':      { arohana: ['S', 'R2', 'M1', 'P', 'D2', 'S.'], avarohana: ['S.', 'D2', 'P', 'M1', 'R2', 'S'] },
    'Surutti':            { arohana: ['S', 'R2', 'M1', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M1', 'G3', 'R2', 'S'] },
    'Thodi':              { arohana: ['S', 'R1', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R1', 'S'] },
    'Vachaspati':         { arohana: ['S', 'R2', 'G3', 'M2', 'P', 'D2', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D2', 'P', 'M2', 'G3', 'R2', 'S'] },
    'Varali':             { arohana: ['S', 'R1', 'G2', 'M2', 'P', 'D1', 'N3', 'S.'], avarohana: ['S.', 'N3', 'D1', 'P', 'M2', 'G2', 'R1', 'S'] },
    'Vasanta':            { arohana: ['S', 'G2', 'M1', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'M1', 'G2', 'R1', 'S'] },
    'Yadukula Kambodhi':  { arohana: ['S', 'R2', 'G2', 'M1', 'P', 'D1', 'N2', 'S.'], avarohana: ['S.', 'N2', 'D1', 'P', 'M1', 'G2', 'R2', 'S'] },
};

/**
 * Look up a raga's scale. Case-insensitive, tries common variant spellings.
 */
export function getRagaScale(ragaName) {
    if (!ragaName) return null;
    // Direct match
    if (RAGA_SCALES[ragaName]) return RAGA_SCALES[ragaName];
    // Case-insensitive
    const lower = ragaName.toLowerCase();
    for (const [key, val] of Object.entries(RAGA_SCALES)) {
        if (key.toLowerCase() === lower) return val;
    }
    return null;
}
