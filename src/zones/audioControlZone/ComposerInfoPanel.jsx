import React from 'react';

/**
 * Static biographical data for well-known Carnatic composers.
 * Keys are lowercased for case-insensitive lookup.
 */
const COMPOSER_BIO = {
    'tyagaraja': {
        years: '1767 – 1847',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: "A towering figure of the Carnatic Trinity, Tyagaraja composed thousands of devotional kritis mostly in Telugu. He introduced 'Sangatis' (melodic variations) and his 'Pancharatna Kritis' remain concert staples. Devoted to Lord Rama, his music blends deep philosophy with emotional surrender.",
    },
    'muthuswami dikshitar': {
        years: '1775 – 1835',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: "A scholar-composer of the Trinity, Dikshitar’s Sanskrit compositions are known for slow, majestic tempos (Chowka kala) and profound raga exploration. A master of the Veena, his works like the 'Navagraha' and 'Kamalamba Navavarna' cycles are monuments of spiritual and musical complexity.",
    },
    'syama sastri': {
        years: '1762 – 1827',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: "The oldest of the Trinity, Syama Sastri mastered complex rhythmic structures and 'tala'. Dedicated to Goddess Kamakshi, his compositions are renowned for emotional depth and intricate patterns. He popularized the 'Swarajati' form, and his gems of rhythmic perfection are highly revered.",
    },
    'swati tirunal': {
        years: '1813 – 1846',
        birthplace: 'Trivandrum, Kerala',
        tradition: 'Royal composer-musician',
        note: "The Maharaja of Travancore was a brilliant polyglot composer writing in multiple languages. He bridged Carnatic and Hindustani traditions with styles ranging from Kritis to Dhrupads. His patronage made his court a cultural hub, and his output remains essential to the classical repertoire.",
    },
    'mysore vasudevacharya': {
        years: '1865 – 1961',
        birthplace: 'Mysore, Karnataka',
        tradition: 'Mysore School',
        note: "A direct disciple of Patnam Subramanya Iyer and court composer for the Mysore Wodeyars, he composed over 200 elegant kritis. His famous 'Brocheva revarura' is a concert staple. He later served as the principal of Kalakshetra, mentoring generations of legendary musicians.",
    },
    'purandaradasa': {
        years: '1484 – 1564',
        birthplace: 'Kshemapura, Karnataka',
        tradition: 'Father of Carnatic Music',
        note: "Revered as the 'Pitamaha' (Grandfather) of Carnatic Music, he systematized its teaching methodology, creating the basic exercises used today. Formerly a wealthy merchant, he renounced his riches for devotion, composing lakhs of songs under the pen-name 'Purandara Vittala'.",
    },
    'annamacharya': {
        years: '1408 – 1503',
        birthplace: 'Tallapaka, Andhra Pradesh',
        tradition: 'Vaishnava Bhakti',
        note: "Known as the 'Pada-kavita Pitamaha', Annamacharya is the earliest known composer of Sankirtanas. He dedicated his life to praising Lord Venkateswara of Tirupati. Discovered on copper plates, his works are a treasure of Telugu literature, blending folk and classical elements with spiritual wisdom.",
    },
    'bhadrachala ramadasu': {
        years: '1620 – 1688',
        birthplace: 'Nerella, Andhra Pradesh',
        tradition: 'Bhakti movement',
        note: "A precursor to Tyagaraja, Ramadasu was a devotee of Rama who used state funds to build the Bhadrachalam temple. Imprisoned for this, legend says Rama and Lakshmana appeared to repay his debt. His soulful kirtanas express rare intimacy and longing for the divine.",
    },
    'patnam subramanya iyer': {
        years: '1845 – 1902',
        birthplace: 'Patnam, Tamil Nadu',
        tradition: 'Post-Trinity era',
        note: "A giant of the post-Trinity era, he carried forward the Tyagaraja lineage as a prolific composer and teacher. Known for his mastery of the Begada raga, he composed technically demanding kritis, varnams, and tillanas that remain pillars of the classical repertoire.",
    },
    'gopalakrishna bharati': {
        years: '1811 – 1896',
        birthplace: 'Mayiladuthurai, Tamil Nadu',
        tradition: 'Tamil classical tradition',
        note: "A seminal Tamil composer best known for the opera 'Nandanar Charitram', which tells the story of a Dalit devotee’s struggle to worship at Chidambaram. His works integrated classical Carnatic forms with powerful narrative and social commentary, challenging the social norms of his time.",
    },
    'oottukkadu venkata kavi': {
        years: '1700 – 1765',
        birthplace: 'Oottukkadu, Tamil Nadu',
        tradition: 'Bhakti tradition',
        note: "A brilliant composer preceding the Trinity, known for complex rhythmic patterns and his 'Saptaratna' series. Predominantly dedicated to Lord Krishna, his music exhibits a unique blend of technical virtuosity and deep devotion, preserved privately for centuries before becoming public.",
    },
    'thyagaraja': {
        years: '1767 – 1847',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: "A towering figure of the Carnatic Trinity, Tyagaraja composed thousands of devotional kritis mostly in Telugu. He introduced 'Sangatis' (melodic variations) and his 'Pancharatna Kritis' remain concert staples. Devoted to Lord Rama, his music blends deep philosophy with emotional surrender.",
    },
};

function lookup(name) {
    if (!name) return null;
    return COMPOSER_BIO[name.trim().toLowerCase()] || null;
}

/**
 * Audio Control Zone → Composer Info Panel (Cell 3 Top)
 *
 * Shows a compact biography card for the song's composer.
 */
export default function ComposerInfoPanel({ songData, isDark, borderColor }) {
    const meta = songData?.meta || {};
    const sd   = songData?.song_details || {};
    const composer = meta.composer || sd.composer || null;

    if (!composer || composer === 'Unknown' || composer === 'Traditional') return null;

    const bio = lookup(composer);

    return (
        <div className="flex flex-col justify-start gap-1.5 h-full">
            {/* Name */}
            <div
                className="font-extrabold text-xl leading-tight"
                style={{ color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}
            >
                {composer}
            </div>

            {/* Bio details */}
            {bio ? (
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {bio.years && (
                            <span className="text-sm font-bold opacity-80">
                                {bio.years}
                            </span>
                        )}
                        {bio.birthplace && (
                            <span
                                className="text-sm font-bold"
                                style={{ color: '#60a5fa' }}
                            >
                                {bio.birthplace}
                            </span>
                        )}
                    </div>
                    {bio.tradition && (
                        <div
                            className="text-[9px] font-black uppercase tracking-[0.15em]"
                            style={{ color: '#a855f7', opacity: 0.7 }}
                        >
                            {bio.tradition}
                        </div>
                    )}
                    {bio.note && (
                        <div
                            className="text-[11px] leading-relaxed opacity-80 mt-2"
                            style={{ maxWidth: '300px' }}
                        >
                            {bio.note}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-[10px] opacity-40 italic">
                    Composer information not available.
                </div>
            )}
        </div>
    );
}
