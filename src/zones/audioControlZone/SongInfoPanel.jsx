import React from 'react';
import { ArrowLeft, Pencil, Heart } from 'lucide-react';
import SwaraScale from '../../components/SwaraScale';
import { getRagaScale } from '../../utils/ragaScales';

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
            const res = await fetch(`/api/songs/${songId}/metadata`, {
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

    // Resolve arohana / avarohana from song_details (preferred) or the raga
    // database fallback. Mirrors the inline logic from EditorSongView.
    const sd = songData?.song_details || {};
    const ragaName = songData?.meta?.raga || sd.raga || '';
    const scale = getRagaScale(ragaName);
    const aro = sd.arohana
        ? (typeof sd.arohana === 'string' ? sd.arohana : sd.arohana.join(' '))
        : (scale ? scale.arohana.join(' ') : null);
    const avaro = sd.avarohana
        ? (typeof sd.avarohana === 'string' ? sd.avarohana : sd.avarohana.join(' '))
        : (scale ? scale.avarohana.join(' ') : null);

    // Pill style — small colored chip used for raga / tala / composer.
    // Pulls from a per-color palette so each meta field is visually distinct
    // at a glance.
    const pill = (label, value, accent) => (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
                background: `${accent}1A`, // ~10% opacity tint
                border: `1px solid ${accent}55`,
                color: accent,
            }}
        >
            <span className="opacity-60">{label}</span>
            <span>{value}</span>
        </span>
    );

    return (
        <div className="flex items-start gap-3 min-w-0 flex-shrink-0" style={{ maxWidth: '42%' }}>
            <button
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center rounded-xl border flex-shrink-0 mt-1"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor }}
            >
                <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="min-w-0 flex-1">
                <div
                    className="font-extrabold text-xl leading-tight truncate"
                    style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}
                    title={songData.meta?.title || 'Untitled'}
                >
                    {songData.meta?.title || 'Untitled'}
                </div>

                {/* Meta pills — wrap onto a second line if the panel is narrow. */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {songData.meta?.raga && pill('Raga', songData.meta.raga, '#10b981')}
                    {songData.meta?.tala && pill('Tala', songData.meta.tala, '#60a5fa')}
                    {songData.meta?.composer && songData.meta.composer !== 'Unknown' &&
                        pill('Composer', songData.meta.composer, '#fbbf24')}
                </div>

                {(aro || avaro) && (
                    <div className="flex flex-col gap-1 mt-2">
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

                <div className="flex items-center gap-2 mt-3">
                    <button
                        onClick={onOpenEditInfo}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                        style={{ color: 'var(--text-muted)', borderColor }}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Info
                    </button>

                    <button
                        onClick={handleFavoriteToggle}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-bold uppercase tracking-wider ${songData?.meta?.isFavorite ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'}`}
                        title={songData?.meta?.isFavorite ? 'Remove from Favorites' : 'Mark as Favorite'}
                    >
                        <Heart className={`w-4 h-4 ${songData?.meta?.isFavorite ? 'fill-rose-500' : ''}`} />
                        Favorite
                    </button>
                </div>
            </div>
        </div>
    );
}
