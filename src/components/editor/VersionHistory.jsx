import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Eye, Clock, Scissors, Crop } from 'lucide-react';
import { apiUrl } from '../../utils/api';

function relativeTime(iso) {
    if (!iso) return '';
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        if (diff < 60000) return rtf.format(-Math.round(diff / 1000), 'second');
        if (diff < 3600000) return rtf.format(-Math.round(diff / 60000), 'minute');
        if (diff < 86400000) return rtf.format(-Math.round(diff / 3600000), 'hour');
        return rtf.format(-Math.round(diff / 86400000), 'day');
    } catch {
        return iso;
    }
}

export default function VersionHistory({ songId, theme, onClose, onRestore }) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(null);

    const isDark = theme !== 'light';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    useEffect(() => {
        if (!songId) return;
        setLoading(true);
        fetch(apiUrl(`/api/songs/${songId}/versions`))
            .then(r => r.json())
            .then(data => { setVersions(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [songId]);

    const handlePreview = async (version) => {
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}/versions/${version.id}`));
            if (!res.ok) return;
            const data = await res.json();
            onRestore({ composition: data.composition, editOps: data.editOps }, false);
        } catch (e) {
            console.error('Preview failed:', e);
        }
    };

    const handleRestore = async (version) => {
        setRestoring(version.id);
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}/restore/${version.id}`), { method: 'POST' });
            if (!res.ok) throw new Error('Restore failed');
            const data = await res.json();
            onRestore({ composition: data.composition, editOps: data.editOps }, true);
        } catch (e) {
            alert('Restore failed: ' + e.message);
        } finally {
            setRestoring(null);
        }
    };

    return (
        <div
            className="flex flex-col h-full"
            style={{
                width: 320,
                background: isDark ? '#111118' : '#f8fafc',
                borderLeft: `1px solid ${borderColor}`,
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-4 flex-shrink-0"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <div>
                    <h3 className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>Version History</h3>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest">{versions.length} saves</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Versions list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 opacity-40 px-4 text-center">
                        <Clock className="w-8 h-8 mb-2" />
                        <p className="text-xs">No saved versions yet. Save to create the first version.</p>
                    </div>
                ) : (
                    <div className="p-3 flex flex-col gap-2">
                        {versions.map((v, i) => (
                            <div
                                key={v.id}
                                className="rounded-xl p-3 border transition-all"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                    borderColor,
                                }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold opacity-80">
                                        {v.label || `Save #${versions.length - i}`}
                                    </span>
                                    {i === 0 && (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                            Latest
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    <Clock className="w-3 h-3" />
                                    <span>{relativeTime(v.timestamp)}</span>
                                    {v.cutsCount > 0 && (
                                        <span className="flex items-center gap-0.5">
                                            <Scissors className="w-2.5 h-2.5" />
                                            {v.cutsCount} cut{v.cutsCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {v.hasTrim && (
                                        <span className="flex items-center gap-0.5">
                                            <Crop className="w-2.5 h-2.5" />
                                            trimmed
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handlePreview(v)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:opacity-100 opacity-70"
                                        style={{ borderColor }}
                                    >
                                        <Eye className="w-3 h-3" />
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => handleRestore(v)}
                                        disabled={restoring === v.id}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                                    >
                                        {restoring === v.id ? (
                                            <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-3 h-3" />
                                        )}
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
