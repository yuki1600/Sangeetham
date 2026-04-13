/**
 * Audio Engine — Microphone access and real-time audio buffer management.
 * Owns the shared AudioContext used by both mic capture (analyser graph) and
 * Song Track Zone playback (MediaElementSource → GainNode graph). Both
 * concerns share one context because browsers prefer it and the unlock-on-
 * gesture machinery already exists for the mic side.
 *
 * The mic is ref-counted: multiple consumers call startMic() / stopMic()
 * independently, and the hardware stream is only torn down when every caller
 * has released it. This prevents ExerciseRunner from destroying the stream
 * that TonicBar / CompactPitchBar / PitchMixerRow are still reading.
 */

let audioContext = null;
let analyserNode = null;
let micStream = null;
let sourceNode = null;
let dataBuffer = null;
let micRefCount = 0; // ← ref count: how many callers have "acquired" the mic

export function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Global gesture unlockers for modern browsers
        const tryResume = () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(err => console.error('Failed to auto-resume AudioContext:', err));
            }
        };
        const events = ['click', 'mousedown', 'pointerdown', 'touchstart', 'keydown'];
        events.forEach(e => window.addEventListener(e, tryResume, { passive: true }));
    }
    return audioContext;
}

/**
 * Resume AudioContext if suspended. Ensures the context exists first so the
 * unlock-on-first-gesture flow works even before mic startup.
 * @returns {Promise<void>}
 */
export async function resumeAudioContext() {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
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
 * Acquire the microphone.  Each caller must pair this with a matching
 * stopMic() call.  The hardware stream is reused if already open.
 * @returns {Promise<{ sampleRate: number }>}
 */
export async function startMic() {
    micRefCount++;
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

        // Ensure shared context exists, then unlock it if necessary
        getAudioContext();
        resumeAudioContext(); // Do not await, let it stay pending until gesture

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
        // Failed — undo the ref increment so the count stays consistent
        micRefCount = Math.max(0, micRefCount - 1);
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
 * Release a mic acquisition.  The hardware stream is only stopped when all
 * callers that called startMic() have called stopMic().
 */
export function stopMic() {
    micRefCount = Math.max(0, micRefCount - 1);

    if (micRefCount > 0) {
        // Other consumers are still using the mic — leave the stream open
        return;
    }

    // All holders have released — tear down the hardware stream
    _teardownMic();
}

/**
 * Force-stop the mic regardless of ref count.  Only call this when
 * intentionally tearing everything down (e.g. page unload).
 */
export function forceStopMic() {
    micRefCount = 0;
    _teardownMic();
}

function _teardownMic() {
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    // Do NOT close audioContext as it is a shared global instance.
    analyserNode = null;
    dataBuffer = null;
}

/**
 * Check if mic is currently active.
 */
export function isMicActive() {
    return audioContext !== null && micStream !== null;
}
