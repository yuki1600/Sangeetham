import React, { useState } from 'react';
import { Globe, Clock, Check } from 'lucide-react';
import { apiUrl } from '../../utils/api';

/**
 * Bottom Bar → Publish Button
 *
 * Tri-state button for the publish-request flow (PRD §3.4).
 *
 *   draft     → "Publish"  (clickable)
 *   pending   → "Pending Review" (disabled, amber)
 *   published → "Published" (disabled, emerald check)
 *
 * On click while in 'draft', POSTs to /api/songs/:id/publish-request which
 * flips publishStatus → 'pending' on the server. The new status is
 * persistent across reloads. Until an admin approves it (Phase 7), the
 * button stays in the 'pending' state.
 */
export default function PublishButton({ songId, publishStatus, onStatusChange, isDark, borderColor, canEdit }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!canEdit) return null;

    const status = publishStatus || 'draft';

    const handleClick = async () => {
        if (status !== 'draft' || !songId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/songs/${songId}/publish-request`), { method: 'POST' });
            if (!res.ok) throw new Error('Publish request failed');
            const data = await res.json();
            if (onStatusChange) onStatusChange(data.publishStatus || 'pending');
        } catch (e) {
            console.error('Publish request failed:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'published') {
        return (
            <button
                disabled
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border cursor-default"
                style={{
                    background: 'rgba(16,185,129,0.15)',
                    borderColor: 'rgba(16,185,129,0.5)',
                    color: '#10b981',
                }}
                title="This song is published in the public library"
            >
                <Check className="w-3.5 h-3.5" />
                Published
            </button>
        );
    }

    if (status === 'pending') {
        return (
            <button
                disabled
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border cursor-default"
                style={{
                    background: 'rgba(251,191,36,0.12)',
                    borderColor: 'rgba(251,191,36,0.5)',
                    color: '#fbbf24',
                }}
                title="Publish request submitted — waiting for admin review"
            >
                <Clock className="w-3.5 h-3.5" />
                Pending Review
            </button>
        );
    }

    // draft
    return (
        <button
            onClick={handleClick}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderColor: 'rgba(16,185,129,0.5)',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
            }}
            title="Submit this song for admin review and publish to the public library"
        >
            <Globe className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting...' : 'Publish'}
        </button>
    );
}
