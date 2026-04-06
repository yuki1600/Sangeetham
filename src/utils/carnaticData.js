/**
 * Carnatic Music Song Library
 * Sourced from the Carnatic desktop project (scraping/output/*.json).
 * Each entry: { id, title, compositionType, raga, tala, composer, exerciseId? }
 * exerciseId links to an EXERCISES entry in exercises.js (if a guided exercise exists).
 */

// ─── Helper ──────────────────────────────────────────────────────────────────
let _seq = 0;
const id = (prefix) => `${prefix}-${++_seq}`;

// ─── Basic Practices ─────────────────────────────────────────────────────────
export const BASIC_PRACTICES = [
    {
        id: 'basic-sarali',
        title: 'Sarali Varisai',
        compositionType: 'Basic Practice',
        raga: 'All Ragas',
        tala: 'Adi',
        composer: 'Unknown',
        exerciseId: 'sarali-varisai-1',
        description: 'Ascending and descending scale patterns: Sa Ri Ga Ma Pa Da Ni Ṡa',
    },
    {
        id: 'basic-janta',
        title: 'Janta Varisai',
        compositionType: 'Basic Practice',
        raga: 'All Ragas',
        tala: 'Adi',
        composer: 'Unknown',
        exerciseId: 'janta-varisai',
        description: 'Double-note patterns: SaSa RiRi GaGa MaMa…',
    },
];

// ─── Geethams ────────────────────────────────────────────────────────────────
export const GEETHAMS = [
    { id: 'g-lambodara', title: 'Lambodara Lakumikara', compositionType: 'Geetham', raga: 'Malahari', tala: 'Rupakam', composer: 'Purandaradasa', exerciseId: 'lambodhara', songViewId: 'lambodhara' },
    { id: 'g-keraya', title: 'Keraya Neeranu', compositionType: 'Geetham', raga: 'Malahari', tala: 'Triputa', composer: 'Purandaradasa', exerciseId: null },
    { id: 'g-kunda', title: 'Kunda Goura', compositionType: 'Geetham', raga: 'Malahari', tala: 'Rupakam', composer: 'Purandaradasa', exerciseId: null },
    { id: 'g-paduma', title: 'Padumanabha', compositionType: 'Geetham', raga: 'Malahari', tala: 'Triputa', composer: 'Purandaradasa', exerciseId: null },
    { id: 'g-analekara', title: 'Analekara', compositionType: 'Geetham', raga: 'Shuddha Saveri', tala: 'Triputa', composer: 'Unknown', exerciseId: null },
    { id: 'g-kamala', title: 'Kamalajaathala', compositionType: 'Geetham', raga: 'Kalyani', tala: 'Triputa', composer: 'Unknown', exerciseId: null },
    { id: 'g-rere', title: 'Rere Sriramachandra', compositionType: 'Geetham', raga: 'Arabhi', tala: 'Triputa', composer: 'Unknown', exerciseId: null },
    { id: 'g-srirama', title: 'Sri Ramachandra', compositionType: 'Geetham', raga: 'Bhairavi', tala: 'Dhruva Talam', composer: 'Unknown', exerciseId: null },
    { id: 'g-varaveena', title: 'VaraVeena', compositionType: 'Geetham', raga: 'Mohanam', tala: 'Rupakam', composer: 'Unknown', exerciseId: null },
];

// ─── Swarajatis ──────────────────────────────────────────────────────────────
export const SWARAJATIS = [
    { id: 'sw-raara', title: 'Raara Venugopa', compositionType: 'Swarajati', raga: 'Bilahari', tala: 'Adi', composer: 'Unknown', exerciseId: null },
    { id: 'sw-samba', title: 'Samba Shivayanave', compositionType: 'Swarajati', raga: 'Khamas', tala: 'Adi', composer: 'Unknown', exerciseId: null },
];

// ─── Varnams ─────────────────────────────────────────────────────────────────
export const VARNAMS = [
    { id: 'v-viriboni', title: 'Viriboni', compositionType: 'Varnam', raga: 'Bhairavi', tala: 'Ata Talam', composer: 'Pachimiriam Adiyappayya', exerciseId: null },
    { id: 'v-chalamela', title: 'Chalamela', compositionType: 'Varnam', raga: 'Shankarabharanam', tala: 'Ata Talam', composer: 'Swati Tirunal', exerciseId: null },
    { id: 'v-entho', title: 'Entho Prema', compositionType: 'Varnam', raga: 'Surutti', tala: 'Adi', composer: 'Pallavi Gopala Iyer', exerciseId: null },
    { id: 'v-era', title: 'Era Napai', compositionType: 'Varnam', raga: 'Thodi', tala: 'Adi', composer: 'Patnam Subramanya Iyer', exerciseId: null },
    { id: 'v-evvari', title: 'Evvari Bodhana', compositionType: 'Varnam', raga: 'Abhogi', tala: 'Adi', composer: 'Patnam Subramanya Iyer', exerciseId: null },
    { id: 'v-innam', title: 'Innam En Manam', compositionType: 'Varnam', raga: 'Charukesi', tala: 'Adi', composer: 'Lalgudi Jayaraman', exerciseId: null },
    { id: 'v-intha', title: 'Intha Chalamu', compositionType: 'Varnam', raga: 'Begada', tala: 'Adi', composer: 'Veenai Kuppayyar', exerciseId: null },
    { id: 'v-jalajakshi', title: 'Jalajakshi', compositionType: 'Varnam', raga: 'Hamsadhwani', tala: 'Adi', composer: 'Manambuchavadi Venkatasubbayyar', exerciseId: null },
    { id: 'v-ninnukori-m', title: 'Ninnukori', compositionType: 'Varnam', raga: 'Mohanam', tala: 'Adi', composer: 'Ramnad Srinivasa Iyengar', exerciseId: null },
    { id: 'v-ninnukori-v', title: 'Ninnukori', compositionType: 'Varnam', raga: 'Vasanta', tala: 'Adi', composer: 'Tacchur Singarachari', exerciseId: null },
    { id: 'v-nive', title: 'Nive Gatiyani', compositionType: 'Varnam', raga: 'Nalinakanthi', tala: 'Adi', composer: 'Lalgudi Jayaraman', exerciseId: null },
    { id: 'v-sami-k', title: 'Sami Dayajuda', compositionType: 'Varnam', raga: 'Kedaragowla', tala: 'Adi', composer: 'Tiruvottriyur Tyagayyar', exerciseId: null },
    { id: 'v-sami-sh', title: 'Sami Ninne', compositionType: 'Varnam', raga: 'Shankarabharanam', tala: 'Adi', composer: 'Veenai Kuppayyar', exerciseId: null },
    { id: 'v-sami-sr', title: 'Sami Ninne', compositionType: 'Varnam', raga: 'Sri Ragam', tala: 'Adi', composer: 'Karur Devudu Iyer', exerciseId: null },
    { id: 'v-sarasuda', title: 'Sarasuda Ninne', compositionType: 'Varnam', raga: 'Saveri', tala: 'Adi', composer: 'Kothavaasal Venkatarama Iyer', exerciseId: null },
    { id: 'v-valachi', title: 'Valachi Vacchi', compositionType: 'Varnam', raga: 'Navaragamalika', tala: 'Adi', composer: 'Patnam Subramanya Iyer', exerciseId: null },
    { id: 'v-vanajakshiro', title: 'Vanajakshiro', compositionType: 'Varnam', raga: 'Kalyani', tala: 'Adi', composer: 'Ramnad Srinivasa Iyengar', exerciseId: null },
    { id: 'v-vanajaksha-k', title: 'Vanajaksha', compositionType: 'Varnam', raga: 'Kalyani', tala: 'Ata Talam', composer: 'Pallavi Gopala Iyer', exerciseId: null },
    { id: 'v-vanajaksha-r', title: 'Vanajaksha', compositionType: 'Varnam', raga: 'Reethigowlai', tala: 'Ata Talam', composer: 'Veenai Kuppayyar', exerciseId: null },
    { id: 'v-sarasija', title: 'Sarasija Nabha', compositionType: 'Varnam', raga: 'Kambodhi', tala: 'Ata Talam', composer: 'Vadivelu', exerciseId: null },
    { id: 'v-nera', title: 'Nera Nammithi', compositionType: 'Varnam', raga: 'Kanada', tala: 'Ata Talam', composer: 'Ramnad Srinivasa Iyengar', exerciseId: null },
    { id: 'v-devar', title: 'Devar Munivar', compositionType: 'Varnam', raga: 'Shanmukhapriya', tala: 'Adi', composer: 'Lalgudi Jayaraman', exerciseId: null },
    { id: 'v-inthamod', title: 'Intha Modi', compositionType: 'Varnam', raga: 'Saaranga', tala: 'Adi', composer: 'Tiruvottriyur Tyagayyar', exerciseId: null },
    { id: 'v-karunimpa', title: 'Karunimpa', compositionType: 'Varnam', raga: 'Sahana', tala: 'Adi', composer: 'Tiruvottriyur Tyagayyar', exerciseId: null },
];

// ─── Krithis (curated selection from kritis.json) ─────────────────────────────
export const KRITHIS = [
    { id: 'k-endaro', title: 'Endaro Mahanu Bhavulu', compositionType: 'Kriti', raga: 'Sri', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-inthakann', title: 'IntakannAnanda', compositionType: 'Kriti', raga: 'Bilahari', tala: 'Rupakam', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-intasauk', title: 'Inta Saukhyamani nE', compositionType: 'Kriti', raga: 'Kapi', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-jagadananda', title: 'Jagadananda Karaka', compositionType: 'Kriti', raga: 'Nattai', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-banturiti', title: 'Bantu rIti', compositionType: 'Kriti', raga: 'Hamsanadam', tala: 'Deshadi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-vatapiganapathi', title: 'Vatapi Ganapathim', compositionType: 'Kriti', raga: 'Hamsadhwani', tala: 'Adi', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-nigumamokkado', title: 'Nigumamokkado', compositionType: 'Kriti', raga: 'Abhogi', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-entaniney', title: 'Entarani', compositionType: 'Kriti', raga: 'Hari Kambodhi', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-dudukugala', title: 'Dudukugala', compositionType: 'Kriti', raga: 'Gowlai', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-dorakuna', title: 'Dorakuna Ituvanti', compositionType: 'Kriti', raga: 'Bilahari', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-chakkani', title: 'Chakkani Raja', compositionType: 'Kriti', raga: 'Kharaharapriya', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-brochevarevare', title: 'Brochevarevare', compositionType: 'Kriti', raga: 'Sri Ranjani', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-himadrisu', title: 'Himadri Suthe PAhimAm', compositionType: 'Kriti', raga: 'Kalyani', tala: 'Rupakam', composer: 'Shyama Shastry', exerciseId: null },
    { id: 'k-marivere', title: 'Mari Vere Gati', compositionType: 'Kriti', raga: 'Ananda Bhairavi', tala: 'Misra Chapu', composer: 'Shyama Shastry', exerciseId: null, songViewId: 'marivere-gati' },
    { id: 'k-devi-neeye', title: 'Devi Neeye Thunai', compositionType: 'Kriti', raga: 'Keeravani', tala: 'Adi', composer: 'Papanasam Sivan', exerciseId: null },
    { id: 'k-ennathavam', title: 'Enna Thavam', compositionType: 'Kriti', raga: 'Kapi', tala: 'Adi', composer: 'Papanasam Sivan', exerciseId: null },
    { id: 'k-abhaya', title: 'Abhayambikaya', compositionType: 'Kriti', raga: 'Kedaragowla', tala: 'Khanda Chapu', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-balagopala', title: 'Balagopala', compositionType: 'Kriti', raga: 'Bhairavi', tala: 'Adi', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-bhajare', title: 'Bhajare Gopalam', compositionType: 'Kriti', raga: 'Hindolam', tala: 'Adi', composer: 'Sadasiva Brahmendra', exerciseId: null },
    { id: 'k-alai', title: 'Alai Payudhe', compositionType: 'Kriti', raga: 'Kanada', tala: 'Adi', composer: 'Oothukkadu Venkata Kavi', exerciseId: null },
    { id: 'k-evvare', title: 'Evvare Ramaiah', compositionType: 'Kriti', raga: 'Gangeya Bhushani', tala: 'Deshadi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-gajavadana', title: 'Gajavadana', compositionType: 'Kriti', raga: 'Sri Ranjani', tala: 'Adi', composer: 'Papanasam Sivan', exerciseId: null },
    { id: 'k-gajananayutham', title: 'Gajananayutham', compositionType: 'Kriti', raga: 'Chakravakam', tala: 'Adi', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-swami-ninne', title: 'Swami Ninne', compositionType: 'Kriti', raga: 'Shankarabharanam', tala: 'Adi', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-dwaitamu', title: 'Dwaitamu Sukhama', compositionType: 'Kriti', raga: 'Reethigowlai', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-guruleka', title: 'Guruleka', compositionType: 'Kriti', raga: 'Gowri Manohari', tala: 'Khanda Chapu', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-elanee', title: 'Ela Nee Daya Raadu', compositionType: 'Kriti', raga: 'Atana', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-dakshinamurthe', title: 'Dakshinamurthe', compositionType: 'Kriti', raga: 'Shankarabharanam', tala: 'Misra Jhampa', composer: 'Muthuswami Dikshitar', exerciseId: null },
    { id: 'k-dehi', title: 'Dehi Tava Pada', compositionType: 'Kriti', raga: 'Sahana', tala: 'Adi', composer: 'Tyagaraja', exerciseId: null },
    { id: 'k-deva-deva', title: 'Deva Deva', compositionType: 'Kriti', raga: 'Mayamalavagowlai', tala: 'Rupakam', composer: 'Swati Tirunal', exerciseId: null },
    { id: 'k-entavini', title: 'Entani Ne', compositionType: 'Kriti', raga: 'Mukhari', tala: 'Rupakam', composer: 'Tyagaraja', exerciseId: null },
];

// ─── Thillanas ───────────────────────────────────────────────────────────────
export const THILLANAS = [
    { id: 't-dheemdheeem', title: 'Dheem Dheem Thillana', compositionType: 'Thillana', raga: 'Revathi', tala: 'Misra Chapu', composer: 'Lalgudi Jayaraman', exerciseId: null },
    { id: 't-brindavani', title: 'Brindavani Thillana', compositionType: 'Thillana', raga: 'Brindavani', tala: 'Adi', composer: 'Lalgudi Jayaraman', exerciseId: null },
    { id: 't-tillana-k', title: 'Tillana in Kamas', compositionType: 'Thillana', raga: 'Kamas', tala: 'Adi', composer: 'Swati Tirunal', exerciseId: null },
];

// ─── Combined list ────────────────────────────────────────────────────────────
export const ALL_SONGS = [
    ...BASIC_PRACTICES,
    ...GEETHAMS,
    ...SWARAJATIS,
    ...VARNAMS,
    ...KRITHIS,
    ...THILLANAS,
];

// ─── Meta: lesson groups shown in the UI ──────────────────────────────────────
export const LESSON_GROUPS = [
    {
        id: 'basic',
        label: 'Basic Practices',
        description: 'Fundamental scale exercises to build your foundation',
        level: 'Basic',
        color: 'from-emerald-600 to-teal-700',
        songs: BASIC_PRACTICES,
    },
    {
        id: 'geetham',
        label: 'Geetham',
        description: 'Simple melodic compositions for beginners',
        level: 'Basic',
        color: 'from-teal-500 to-emerald-600',
        songs: GEETHAMS,
    },
    {
        id: 'swarajati',
        label: 'Swarajati',
        description: 'Compositions with swara, jati, and sahitya sections',
        level: 'Intermediate',
        color: 'from-emerald-500 to-teal-600',
        songs: SWARAJATIS,
    },
    {
        id: 'varnam',
        label: 'Varnam',
        description: 'Complex compositions covering all aspects of a raga',
        level: 'Intermediate',
        color: 'from-teal-600 to-emerald-700',
        songs: VARNAMS,
    },
    {
        id: 'kriti',
        label: 'Kriti',
        description: 'Classical three-part compositions — pallavi, anupallavi, charanam',
        level: 'Advanced',
        color: 'from-emerald-600 to-teal-500',
        songs: KRITHIS,
    },
    {
        id: 'thillana',
        label: 'Thillana',
        description: 'Rhythmically vibrant compositions for advanced practitioners',
        level: 'Advanced',
        color: 'from-teal-500 to-emerald-600',
        songs: THILLANAS,
    },
];
