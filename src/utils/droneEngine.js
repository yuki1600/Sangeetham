/**
 * Tanpura/Veena-style drone engine using Tone.js.
 * 
 * Uses plucked-string synthesis with harmonic overtones and
 * a cyclic strumming pattern (Pa → Sa' → Sa' → Sa) like a real tanpura.
 * The "jivari" buzzing effect is simulated with rich harmonics and
 * slow amplitude envelopes.
 */
import * as Tone from 'tone';

let droneNodes = null;
let isPlaying = false;
let strumLoop = null;
let generationId = 0;
let droneVolume = -10; // Master volume in dB
let masterGainNode = null;

/**
 * Create a single plucked-string voice with rich harmonics.
 * Uses additive synthesis (sine harmonics) shaped by an
 * amplitude envelope to mimic a plucked string's decay.
 */
function createStringVoice(frequency, outputNode, options = {}) {
    const {
        volume = -26,
        harmonics = [1, 0.5, 0.33, 0.25, 0.15, 0.1, 0.07, 0.05],
        attackTime = 0.02,
        decayTime = 3,
        sustainLevel = 0.15,
        releaseTime = 2,
    } = options;

    // Create partial oscillators for rich timbre
    const partials = harmonics.map((amp, i) => {
        const osc = new Tone.Oscillator({
            frequency: frequency * (i + 1),
            type: 'sine',
            volume: Tone.gainToDb(amp) + volume,
        });
        return osc;
    });

    // Amplitude envelope for pluck feel
    const envelope = new Tone.AmplitudeEnvelope({
        attack: attackTime,
        decay: decayTime,
        sustain: sustainLevel,
        release: releaseTime,
    }).connect(outputNode);

    // Connect all partials through the envelope
    partials.forEach(osc => osc.connect(envelope));

    return {
        start: () => {
            partials.forEach(osc => osc.start());
            envelope.triggerAttack();
        },
        retrigger: () => {
            envelope.triggerRelease();
            setTimeout(() => {
                envelope.triggerAttack();
            }, 50);
        },
        stop: () => {
            envelope.triggerRelease();
            setTimeout(() => {
                partials.forEach(osc => {
                    try { osc.stop(); } catch (e) { }
                });
            }, 200);
        },
        dispose: () => {
            partials.forEach(osc => {
                try { osc.dispose(); } catch (e) { }
            });
            try { envelope.dispose(); } catch (e) { }
        },
    };
}

/**
 * Start the tanpura drone with veena-like plucked string synthesis.
 * Implements a cyclic strumming pattern: Pa → Sa' → Sa' → Sa
 * @param {number} tonicHz - Sa frequency in Hz
 */
export async function startDrone(tonicHz) {
    if (isPlaying) stopDrone();

    const currentGen = ++generationId;
    await Tone.start();

    // --- Effects chain ---
    // Master gain for drone volume control
    if (!masterGainNode) {
        masterGainNode = new Tone.Volume(droneVolume).toDestination();
    }

    // Warm reverb for resonance
    const reverb = new Tone.Reverb({ decay: 6, wet: 0.35 }).connect(masterGainNode);
    await reverb.generate();

    // If a stop or another start happened while we were generating reverb, abort
    if (currentGen !== generationId) {
        reverb.dispose();
        return;
    }

    // Subtle chorus for thickness
    const chorus = new Tone.Chorus({
        frequency: 0.3,
        delayTime: 3.5,
        depth: 0.15,
        wet: 0.2,
    }).connect(reverb);
    chorus.start();

    // Gentle low-pass filter to soften harshness
    const filter = new Tone.Filter({
        frequency: 2500,
        type: 'lowpass',
        rolloff: -12,
    }).connect(chorus);

    // --- Tanpura string voices ---
    // Real tanpura: 4 strings — Pa, Sa'(middle), Sa'(middle), Sa(low)
    const paFreq = tonicHz * 1.5;    // Pa string
    const saHighFreq = tonicHz * 2;   // Sa' (upper octave)
    const saFreq = tonicHz;           // Sa (tonic)

    // Harmonic profile that mimics wire string with jivari (buzzing bridge)
    // Rich in odd harmonics, slight emphasis on 2nd and 3rd
    const tanpuraHarmonics = [1.0, 0.7, 0.5, 0.35, 0.25, 0.18, 0.12, 0.08, 0.05, 0.03];

    const voiceOptions = {
        harmonics: tanpuraHarmonics,
        volume: -14, // Increased from -24
        attackTime: 0.015,
        decayTime: 4,
        sustainLevel: 0.1,
        releaseTime: 3,
    };

    const paVoice = createStringVoice(paFreq, filter, {
        ...voiceOptions,
        volume: -30, // Increased from -40
    });

    const saHigh1 = createStringVoice(saHighFreq, filter, {
        ...voiceOptions,
        volume: -28, // Increased from -38
    });

    const saHigh2 = createStringVoice(saHighFreq, filter, {
        ...voiceOptions,
        volume: -29, // Increased from -39
    });

    const saLow = createStringVoice(saFreq, filter, {
        ...voiceOptions,
        volume: -27, // Increased from -37
        decayTime: 5, // Bass string rings longer
        sustainLevel: 0.12,
    });

    // Start all voices
    paVoice.start();
    saHigh1.start();
    saHigh2.start();
    saLow.start();

    // --- Cyclic strumming pattern ---
    // Tanpura pattern: Pa → Sa' → Sa' → Sa, each pluck ~1 second apart
    const voices = [paVoice, saHigh1, saHigh2, saLow];
    let currentVoice = 0;

    strumLoop = setInterval(() => {
        voices[currentVoice].retrigger();
        currentVoice = (currentVoice + 1) % voices.length;
    }, 1100); // ~1.1 seconds between plucks

    droneNodes = {
        voices,
        reverb,
        chorus,
        filter,
        masterGainNode,
    };
    isPlaying = true;
}

/**
 * Stop the drone and clean up all resources.
 */
export function stopDrone() {
    generationId++;

    if (strumLoop) {
        clearInterval(strumLoop);
        strumLoop = null;
    }

    if (!droneNodes) return;

    const { voices, reverb, chorus, filter } = droneNodes;

    voices.forEach(v => v.stop());

    // Delayed dispose to allow release tails
    setTimeout(() => {
        voices.forEach(v => {
            try { v.dispose(); } catch (e) { }
        });
        try { filter.dispose(); } catch (e) { }
        try { chorus.dispose(); } catch (e) { }
        try { reverb.dispose(); } catch (e) { }
    }, 500);

    droneNodes = null;
    isPlaying = false;
}

/**
 * Check if drone is currently playing.
 */
export function isDronePlaying() {
    return isPlaying;
}

/**
 * Set the master volume of the drone in dB.
 * @param {number} db - volume in decibels
 */
export function setDroneVolume(db) {
    droneVolume = db;
    if (masterGainNode) {
        masterGainNode.volume.value = db;
    }
}

/**
 * Get the current drone volume in dB.
 */
export function getDroneVolume() {
    return droneVolume;
}
