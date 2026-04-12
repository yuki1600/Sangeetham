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
        note: 'Prolific composer of ~24,000 kritis; devoted to Rama.',
    },
    'muthuswami dikshitar': {
        years: '1775 – 1835',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: 'Known for majestic Sanskrit kritis and Melakartha raga series.',
    },
    'syama sastri': {
        years: '1762 – 1827',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: 'Celebrated for emotionally intense swarajatis and kritis.',
    },
    'swati tirunal': {
        years: '1813 – 1846',
        birthplace: 'Trivandrum, Kerala',
        tradition: 'Royal composer-musician',
        note: 'Composed in Sanskrit, Malayalam, Telugu, and Hindi.',
    },
    'mysore vasudevacharya': {
        years: '1865 – 1961',
        birthplace: 'Mysore, Karnataka',
        tradition: 'Mysore School',
        note: 'Royal court composer; student of Patnam Subramanya Iyer.',
    },
    'purandaradasa': {
        years: '1484 – 1564',
        birthplace: 'Kshemapura, Karnataka',
        tradition: 'Father of Carnatic Music',
        note: 'Standardised music pedagogy; composed 4.75 lakh songs.',
    },
    'annamacharya': {
        years: '1408 – 1503',
        birthplace: 'Tallapaka, Andhra Pradesh',
        tradition: 'Vaishnava Bhakti',
        note: 'Earliest known composer of Telugu kirtanas; devoted to Venkateswara.',
    },
    'bhadrachala ramadasu': {
        years: '1620 – 1688',
        birthplace: 'Nerella, Andhra Pradesh',
        tradition: 'Bhakti movement',
        note: 'Devoted to Rama at Bhadrachalam; composed over 100 kirtanas.',
    },
    'patnam subramanya iyer': {
        years: '1845 – 1902',
        birthplace: 'Patnam, Tamil Nadu',
        tradition: 'Post-Trinity era',
        note: 'Teacher of Mysore Vasudevacharya; renowned for kritis and varnams.',
    },
    'gopalakrishna bharati': {
        years: '1811 – 1896',
        birthplace: 'Mayiladuthurai, Tamil Nadu',
        tradition: 'Tamil classical tradition',
        note: 'Composed the timeless Nandanar Charitram.',
    },
    'oottukkadu venkata kavi': {
        years: '1700 – 1765',
        birthplace: 'Oottukkadu, Tamil Nadu',
        tradition: 'Bhakti tradition',
        note: 'Composed over 400 kritis predominantly on Krishna.',
    },
    'thyagaraja': {
        years: '1767 – 1847',
        birthplace: 'Tiruvarur, Tamil Nadu',
        tradition: 'Trinity of Carnatic Music',
        note: 'Prolific composer of ~24,000 kritis; devoted to Rama.',
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
                className="font-black text-sm leading-tight"
                style={{ color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}
            >
                {composer}
            </div>

            {/* Bio details */}
            {bio ? (
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {bio.years && (
                            <span className="text-[10px] font-semibold opacity-60">
                                {bio.years}
                            </span>
                        )}
                        {bio.birthplace && (
                            <span
                                className="text-[10px] font-semibold"
                                style={{ color: '#60a5fa', opacity: 0.8 }}
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
                            className="text-[10px] leading-snug opacity-50 mt-0.5"
                            style={{ maxWidth: '220px' }}
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
