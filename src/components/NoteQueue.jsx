import React from 'react';

export default function NoteQueue({ sequence, currentIndex }) {
    // Show current + next 3 notes
    const visibleRange = 4;
    const startIdx = currentIndex;
    const endIdx = Math.min(startIdx + visibleRange, sequence.length);

    return (
        <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-xs text-[var(--text-muted)] mr-2 uppercase tracking-wider">Notes:</span>
            <div className="flex items-center gap-1.5">
                {sequence.slice(startIdx, endIdx).map((note, i) => {
                    const isCurrent = i === 0;
                    return (
                        <div
                            key={`${startIdx + i}-${note.swara}`}
                            className={`
                px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-300
                ${isCurrent
                                    ? 'note-current bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg scale-110'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
                                }
              `}
                        >
                            {note.swara}
                        </div>
                    );
                })}
                {endIdx < sequence.length && (
                    <span className="text-[var(--text-muted)] text-xs ml-1">
                        +{sequence.length - endIdx} more
                    </span>
                )}
            </div>
            <div className="ml-auto text-xs text-[var(--text-muted)]">
                {currentIndex + 1} / {sequence.length}
            </div>
        </div>
    );
}
