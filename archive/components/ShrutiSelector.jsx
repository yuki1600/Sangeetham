import React from 'react';
import { TONIC_PRESETS } from '../utils/swaraUtils';

export default function ShrutiSelector({ selectedTonic, onSelect }) {
    return (
        <div className="glass-card p-5 fade-in">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Select Shruti (Tonic)
            </h3>
            <div className="grid grid-cols-6 gap-2">
                {TONIC_PRESETS.map((preset) => {
                    const isSelected = preset.hz === selectedTonic;
                    return (
                        <button
                            key={preset.name}
                            onClick={() => onSelect(preset.hz)}
                            className={`
                py-2.5 px-1 rounded-xl text-sm font-semibold transition-all duration-200
                ${isSelected
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white border border-[var(--glass-border)]'
                                }
              `}
                        >
                            {preset.name}
                            <span className="block text-[10px] opacity-60 mt-0.5">{Math.round(preset.hz)} Hz</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
