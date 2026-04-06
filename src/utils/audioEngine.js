/**
 * Audio Engine — Microphone access and real-time audio buffer management.
 * Uses its own AudioContext, separate from Tone.js.
 */

let audioContext = null;
let analyserNode = null;
let micStream = null;
let sourceNode = null;
let dataBuffer = null;

/**
 * Resume AudioContext if suspended.
 * @returns {Promise<void>}
 */
export async function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (err) {
            console.error('Failed to resume AudioContext:', err);
        }
    }
}

/**
 * Get current state of the AudioContext.
 * @returns {string} 'running', 'suspended', 'closed', or 'none'
 */
export function getAudioContextState() {
    return audioContext?.state ?? 'none';
}

/**
 * Start microphone capture and set up analyser.
 * @returns {Promise<{ sampleRate: number }>}
 */
export async function startMic() {
    try {
        if (!micStream) {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
        }

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Always try to resume context
        await resumeAudioContext();

        if (!analyserNode) {
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048;
            analyserNode.smoothingTimeConstant = 0;

            sourceNode = audioContext.createMediaStreamSource(micStream);
            sourceNode.connect(analyserNode);

            dataBuffer = new Float32Array(analyserNode.fftSize);
        }

        return { sampleRate: audioContext.sampleRate };
    } catch (err) {
        console.error('Microphone access failed:', err);
        throw err;
    }
}

/**
 * Get current time-domain audio data.
 * @returns {Float32Array | null}
 */
export function getAudioBuffer() {
    if (!analyserNode || !dataBuffer) return null;
    analyserNode.getFloatTimeDomainData(dataBuffer);
    return dataBuffer;
}

/**
 * Get the current sample rate.
 */
export function getSampleRate() {
    return audioContext?.sampleRate ?? 44100;
}

/**
 * Check if audio input has signal (not silence).
 */
export function hasSignal() {
    const buffer = getAudioBuffer();
    if (!buffer) return false;
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    return rms > 0.01;
}

/**
 * Stop microphone and clean up.
 */
export function stopMic() {
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    analyserNode = null;
    dataBuffer = null;
}

/**
 * Check if mic is currently active.
 */
export function isMicActive() {
    return audioContext !== null && micStream !== null;
}
