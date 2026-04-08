import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * TrackOrderButtons — small up/down arrow pair pinned to the top-right of a
 * track frame, used to swap a track with its neighbour above or below in the
 * Song Track Zone stack. Disabled at the ends of the stack.
 *
 * Both arrows live in one segmented pill so the visual footprint stays small
 * and the buttons read as a single grouped control rather than two stray
 * icons floating in the track corner.
 */
export default function TrackOrderButtons({ onMoveUp, onMoveDown, canMoveUp, canMoveDown, isDark }) {
    const baseBtn = 'flex items-center justify-center w-7 h-7 transition-all hover:brightness-125 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100';
    const divider = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

    return (
        <div
            className="pointer-events-auto inline-flex items-center rounded-md overflow-hidden"
            style={{
                background: isDark ? 'rgba(20,20,32,0.92)' : 'rgba(255,255,255,0.96)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'}`,
                color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(8px)',
                boxShadow: isDark
                    ? '0 4px 14px rgba(0,0,0,0.45)'
                    : '0 2px 10px rgba(0,0,0,0.1)',
            }}
        >
            <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                title="Move track up"
                className={baseBtn}
                style={{ borderRight: `1px solid ${divider}` }}
            >
                <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                title="Move track down"
                className={baseBtn}
            >
                <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            </button>
        </div>
    );
}
