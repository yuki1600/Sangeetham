import React from 'react';

/**
 * Renders a space-separated swara string with octave dots above/below.
 * S. → dot above S, .P → dot below P
 */
export default function SwaraScale({ swaras, color = '#a855f7', className = '' }) {
    if (!swaras) return null;
    const tokens = typeof swaras === 'string' ? swaras.split(/\s+/).filter(Boolean) : swaras;

    return (
        <span className={`inline-flex items-baseline gap-2 ${className}`}>
            {tokens.map((tok, i) => {
                let text = tok;
                let octave = null;
                if (text.endsWith('.')) {
                    octave = 'higher';
                    text = text.slice(0, -1);
                } else if (text.startsWith('.')) {
                    octave = 'lower';
                    text = text.slice(1);
                }
                return (
                    <span key={i} className="relative inline-flex flex-col items-center" style={{ color }}>
                        {octave === 'higher' && (
                            <span className="absolute -top-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                        )}
                        <span>{text}</span>
                        {octave === 'lower' && (
                            <span className="absolute -bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                        )}
                    </span>
                );
            })}
        </span>
    );
}
