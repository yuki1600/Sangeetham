import React from 'react';

export default function LaneLabel({ label, isDark }) {
    return (
        <div
            className="absolute top-2 left-4 z-30 text-[11px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-xl pointer-events-none"
            style={{
                color: isDark ? '#fff' : '#000',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                backdropFilter: 'blur(12px)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 15px rgba(0,0,0,0.08)',
            }}
        >
            {label}
        </div>
    );
}
