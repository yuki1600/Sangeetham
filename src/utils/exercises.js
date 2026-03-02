/**
 * Exercise definitions for guided Carnatic swara practice.
 * Each exercise = { name, description, difficulty, sequence }
 * sequence = array of { swara, durationMs }
 */

export const EXERCISES = [
    {
        id: 'sustain-sa',
        name: 'Free Sandbox',
        description: 'No fixed sequence. Just sing and explore your voice with the pitch monitor.',
        difficulty: 1,
        icon: 'Palette',
        sequence: [
            { swara: 'Sa', durationMs: 600000 }, // 10 minutes for "free" feel
        ],
    },
    {
        id: 'sarali-varisai-1',
        name: 'Sarali Varisai',
        description: 'Ascending and descending: Sa Ri Ga Ma Pa Da Ni Ṡa and back.',
        difficulty: 2,
        icon: 'TrendingUp',
        sequence: [
            // Ascending
            { swara: 'Sa', durationMs: 2000 },
            { swara: 'Ri', durationMs: 2000 },
            { swara: 'Ga', durationMs: 2000 },
            { swara: 'Ma', durationMs: 2000 },
            { swara: 'Pa', durationMs: 2000 },
            { swara: 'Da', durationMs: 2000 },
            { swara: 'Ni', durationMs: 2000 },
            { swara: 'Ṡa', durationMs: 2000 },
            // Descending
            { swara: 'Ni', durationMs: 2000 },
            { swara: 'Da', durationMs: 2000 },
            { swara: 'Pa', durationMs: 2000 },
            { swara: 'Ma', durationMs: 2000 },
            { swara: 'Ga', durationMs: 2000 },
            { swara: 'Ri', durationMs: 2000 },
            { swara: 'Sa', durationMs: 2000 },
        ],
    },
    {
        id: 'janta-varisai',
        name: 'Janta Varisai',
        description: 'Double notes: SaSa RiRi GaGa MaMa PaPa DaDa NiNi ṠaṠa and back.',
        difficulty: 3,
        icon: 'Music2',
        sequence: [
            // Ascending doubles
            { swara: 'Sa', durationMs: 1500 },
            { swara: 'Sa', durationMs: 1500 },
            { swara: 'Ri', durationMs: 1500 },
            { swara: 'Ri', durationMs: 1500 },
            { swara: 'Ga', durationMs: 1500 },
            { swara: 'Ga', durationMs: 1500 },
            { swara: 'Ma', durationMs: 1500 },
            { swara: 'Ma', durationMs: 1500 },
            { swara: 'Pa', durationMs: 1500 },
            { swara: 'Pa', durationMs: 1500 },
            { swara: 'Da', durationMs: 1500 },
            { swara: 'Da', durationMs: 1500 },
            { swara: 'Ni', durationMs: 1500 },
            { swara: 'Ni', durationMs: 1500 },
            { swara: 'Ṡa', durationMs: 1500 },
            { swara: 'Ṡa', durationMs: 1500 },
            // Descending doubles
            { swara: 'Ni', durationMs: 1500 },
            { swara: 'Ni', durationMs: 1500 },
            { swara: 'Da', durationMs: 1500 },
            { swara: 'Da', durationMs: 1500 },
            { swara: 'Pa', durationMs: 1500 },
            { swara: 'Pa', durationMs: 1500 },
            { swara: 'Ma', durationMs: 1500 },
            { swara: 'Ma', durationMs: 1500 },
            { swara: 'Ga', durationMs: 1500 },
            { swara: 'Ga', durationMs: 1500 },
            { swara: 'Ri', durationMs: 1500 },
            { swara: 'Ri', durationMs: 1500 },
            { swara: 'Sa', durationMs: 1500 },
            { swara: 'Sa', durationMs: 1500 },
        ],
    },
    {
        id: 'lambodhara',
        name: 'Lambodhara Lakumikara',
        description: 'Sri Gananatha - Malahari Geetham. Follow the audio and match the swaras.',
        difficulty: 4,
        icon: 'Mic',
        audioUrl: '/lambodhara.mp3',
        recommendedTonic: 196.00,
        sequence: [
            // Line 1: m p d S | S d p p | d p m p | m r s ,
            { swara: 'Ma', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Da', durationMs: 500 }, { swara: 'Ṡa', durationMs: 500 },
            { swara: 'Ṡa', durationMs: 500 }, { swara: 'Da', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Pa', durationMs: 500 },
            { swara: 'Da', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Ma', durationMs: 500 }, { swara: 'Pa', durationMs: 500 },
            { swara: 'Ma', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Sa', durationMs: 500 }, { swara: 'Sa', durationMs: 500 },

            // Line 3: p d S , | d p m , | p m r , | s r m ,
            { swara: 'Pa', durationMs: 500 }, { swara: 'Da', durationMs: 500 }, { swara: 'Ṡa', durationMs: 1000 },
            { swara: 'Da', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Ma', durationMs: 1000 },
            { swara: 'Pa', durationMs: 500 }, { swara: 'Ma', durationMs: 500 }, { swara: 'Ri', durationMs: 1000 },
            { swara: 'Sa', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Ma', durationMs: 1000 },

            // Line 4: p m p , | m r s , | r s r m | g r s ,
            { swara: 'Pa', durationMs: 500 }, { swara: 'Ma', durationMs: 500 }, { swara: 'Pa', durationMs: 1000 },
            { swara: 'Ma', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Sa', durationMs: 1000 },
            { swara: 'Ri', durationMs: 500 }, { swara: 'Sa', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Ma', durationMs: 500 },
            { swara: 'Ga', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Sa', durationMs: 1000 },

            // Pallavi Repeat / Extension (Approximate based on 44s)
            { swara: 'Ma', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Da', durationMs: 500 }, { swara: 'Ṡa', durationMs: 500 },
            { swara: 'Ṡa', durationMs: 500 }, { swara: 'Da', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Pa', durationMs: 500 },
            { swara: 'Da', durationMs: 500 }, { swara: 'Pa', durationMs: 500 }, { swara: 'Ma', durationMs: 500 }, { swara: 'Pa', durationMs: 500 },
            { swara: 'Ma', durationMs: 500 }, { swara: 'Ri', durationMs: 500 }, { swara: 'Sa', durationMs: 1000 },
        ],
    },
];
