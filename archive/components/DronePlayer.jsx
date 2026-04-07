import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { startDrone, stopDrone, isDronePlaying } from '../utils/droneEngine';

export default function DronePlayer({ tonicHz }) {
    const [active, setActive] = useState(isDronePlaying());

    // Restart drone if tonic changes while playing
    useEffect(() => {
        if (active) {
            startDrone(tonicHz);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tonicHz]);

    const toggle = useCallback(async () => {
        if (active) {
            stopDrone();
            setActive(false);
        } else {
            await startDrone(tonicHz);
            setActive(true);
        }
    }, [active, tonicHz]);

    return (
        <div className="glass-card p-5 fade-in">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Shruti Box (Drone)
            </h3>
            <button
                onClick={toggle}
                className={`
          w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3
          ${active
                        ? 'drone-active bg-[var(--bg-card)] text-[var(--accent-purple)] border border-[var(--accent-purple)]'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)]'
                    }
        `}
            >
                <span className={`${active ? 'mic-active' : ''}`}>
                    {active ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </span>
                <span>{active ? 'Drone Playing' : 'Start Drone'}</span>
            </button>
            {active && (
                <p className="text-xs text-[var(--text-muted)] text-center mt-2 animate-pulse">
                    Sa + Pa + Ṡa — Tanpura Drone
                </p>
            )}
        </div>
    );
}
