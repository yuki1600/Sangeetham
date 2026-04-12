import React from 'react';
import { ArrowLeft, Pencil, Heart } from 'lucide-react';
import SwaraScale from '../../components/SwaraScale';
import { getRagaScale } from '../../utils/ragaScales';
import { apiUrl } from '../../utils/api';

/**
 * Audio Control Zone → Song Info
 *
 * Left cluster of the header. Contains the back button, song title,
 * raga / tala / composer pills, the arohana / avarohana display, the
 * Edit Info button, and the Favorite toggle.
 *
 * Note: in the mockup, "Composer Info" is a separate cell from "Song Info".
 * In the current implementation they share the same left column, with
 * arohana/avarohana rendered inline below the raga/tala/composer pills.
 * Phase 4 (zoned grid) will split them into two cells; for now they live
 * together here.
 */
export default function SongInfoPanel({
    songData,
    songId,
    onBack,
    onSongDataChange,                       // setSongData
    onOpenEditInfo,                         // openEditInfo
    isDark,
    borderColor,
}) {
    const handleFavoriteToggle = async () => {
        const newFav = !songData.meta.isFavorite;
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}/metadata`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raga: songData.meta.raga,
                    tala: songData.meta.tala,
                    isFavorite: newFav,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                onSongDataChange(prev => ({
                    ...prev,
                    meta: { ...prev.meta, isFavorite: newFav },
                }));
            }
        } catch (e) {
            console.error('Failed toggling favorite:', e);
        }
    };

    // Resolve arohana / avarohana.
    // JSON files use 'arohanam'/'avarohanam'; older entries may use 'arohana'/'avarohana'.
    // Fall back to the raga database as a last resort.
    const sd = songData?.song_details || {};
    const ragaName = songData?.meta?.raga || sd.raga || '';
    const scale = getRagaScale(ragaName);

    const rawAro  = sd.arohanam  || sd.arohana;
    const rawAvaro = sd.avarohanam || sd.avarohana;

    const aro   = rawAro
        ? (typeof rawAro === 'string' ? rawAro : rawAro.join(' '))
        : (scale ? scale.arohana.join(' ') : null);
    const avaro = rawAvaro
        ? (typeof rawAvaro === 'string' ? rawAvaro : rawAvaro.join(' '))
        : (scale ? scale.avarohana.join(' ') : null);

    // Pill style — small colored chip used for raga / tala / composer.
    // Pulls from a per-color palette so each meta field is visually distinct
    // at a glance.
    const pill = (label, value, accent) => (
        <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
                background: `${accent}1A`,
                border: `1px solid ${accent}55`,
                color: accent,
            }}
        >
            <span className="opacity-55">{label}:</span>
            <span>{value}</span>
        </span>
    );

    return (
        <div className="flex items-start gap-3 min-w-0">
            <button
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center rounded-xl border flex-shrink-0"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
            >
                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                    <div
                        className="font-extrabold text-xl leading-tight min-w-0"
                        style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}
                        title={songData.meta?.title || 'Untitled'}
                    >
                        {songData.meta?.title || 'Untitled'}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={onOpenEditInfo}
                            className="p-1.5 rounded-lg border transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                            style={{ color: 'var(--text-muted)', borderColor }}
                            title="Edit Info"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={handleFavoriteToggle}
                            className={`p-1.5 rounded-lg border transition-all ${songData?.meta?.isFavorite ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : 'border-white/10 text-[var(--text-muted)] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'}`}
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: songData?.meta?.isFavorite ? undefined : borderColor }}
                            title={songData?.meta?.isFavorite ? 'Remove from Favorites' : 'Mark as Favorite'}
                        >
                            <Heart className={`w-3.5 h-3.5 ${songData?.meta?.isFavorite ? 'fill-rose-500' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Meta pills — wrap naturally in the 1/4 column */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap max-w-full">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {songData.meta?.raga && pill('Raga', songData.meta.raga, '#10b981')}
                        {songData.meta?.tala && pill('Tala', songData.meta.tala, '#60a5fa')}
                    </div>
                    {(songData.meta?.compositionType || songData.song_details?.compositionType) && (
                        <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                            style={{
                                background: 'rgba(168,85,247,0.1)',
                                border: '1px solid rgba(168,85,247,0.4)',
                                color: '#a855f7',
                            }}
                        >
                            {songData.meta?.compositionType || songData.song_details?.compositionType}
                        </span>
                    )}
                </div>

                {(aro || avaro) && (
                    <div className="flex flex-col gap-1 mt-3">
                        {aro && (
                            <div className="flex items-center gap-2">
                                <span className="opacity-50 uppercase text-[11px] font-bold tracking-wider">Aro</span>
                                <SwaraScale swaras={aro} color="#a855f7" className="text-base font-bold" />
                            </div>
                        )}
                        {avaro && (
                            <div className="flex items-center gap-2">
                                <span className="opacity-50 uppercase text-[11px] font-bold tracking-wider">Avaro</span>
                                <SwaraScale swaras={avaro} color="#a855f7" className="text-base font-bold" />
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
