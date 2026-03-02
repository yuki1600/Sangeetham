let currentSampleRate = 44100;

/**
 * Initialize the pitch detector.
 * @param {number} sampleRate
 */
export function initPitchDetector(sampleRate = 44100) {
    currentSampleRate = sampleRate;
}

/**
 * Detect pitch from audio buffer using Autocorrelation + Parabolic Interpolation.
 * @param {Float32Array} buffer - Time-domain audio data
 * @returns {number | null} Frequency in Hz, or null if no pitch detected
 */
export function detectPitch(buffer) {
    if (!buffer) return null;

    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);

    // Calculate RMS to check signal level
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);

    // Extremely quiet/noise floor - no pitch
    if (rms < 0.005) {
        return null;
    }

    // Normalize the buffer
    const normalizedBuffer = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
        normalizedBuffer[i] = buffer[i];
    }

    // Autocorrelation
    const correlations = new Float32Array(MAX_SAMPLES);
    for (let lag = 0; lag < MAX_SAMPLES; lag++) {
        let sum = 0;
        for (let i = 0; i < MAX_SAMPLES; i++) {
            sum += normalizedBuffer[i] * normalizedBuffer[i + lag];
        }
        correlations[lag] = sum;
    }

    // Find the first peak after the initial decline
    let foundPeak = false;
    let bestLag = 0;
    let bestCorrelation = 0;

    // Skip the first few samples (frequencies too high for normal vocalization)
    const minLag = Math.floor(currentSampleRate / 1000); // Max 1000Hz (B5)
    const maxLag = Math.floor(currentSampleRate / 60);   // Min 60Hz (B1)

    for (let lag = minLag; lag < Math.min(maxLag, MAX_SAMPLES); lag++) {
        // Look for peak
        if (correlations[lag] > correlations[lag - 1] &&
            correlations[lag] > correlations[lag + 1]) {
            if (correlations[lag] > bestCorrelation) {
                bestCorrelation = correlations[lag];
                bestLag = lag;
                foundPeak = true;
            }
        }
    }

    if (!foundPeak || bestLag === 0) {
        return null;
    }

    // Confidence metric (normalized by the zero-lag max energy)
    const confidence = bestCorrelation / correlations[0];

    // In low confidence, the peak is likely noise/breath rather than a clear pitch
    if (confidence < 0.4) {
        return null;
    }

    // Parabolic interpolation for sub-sample accuracy (essential for cents accuracy)
    const y1 = correlations[bestLag - 1];
    const y2 = correlations[bestLag];
    const y3 = correlations[bestLag + 1];

    let refinedLag = bestLag;
    // Prevent division by zero mathematically
    const denom = 2 * (2 * y2 - y1 - y3);
    if (denom !== 0) {
        refinedLag = bestLag + (y3 - y1) / denom;
    }

    const frequency = currentSampleRate / refinedLag;

    // Additional safeguard bounds
    if (frequency < 60 || frequency > 1200) {
        return null;
    }

    return frequency;
}

/**
 * Extracts a complete pitch curve from an audio file URL using OfflineAudioContext.
 * @param {string} audioUrl - URL of the audio file.
 * @param {number} hopSize - Step size in milliseconds between pitch samples.
 * @returns {Promise<Array<{ time: number, hz: number | null }>>}
 */
export async function extractPitchCurveFromAudio(audioUrl, hopSize = 25) {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

        const sampleRate = audioBuffer.sampleRate;
        const channelData = audioBuffer.getChannelData(0);

        const originalSampleRate = currentSampleRate;
        currentSampleRate = sampleRate;

        const curve = [];
        const winSamples = 2048;
        const hopSamples = Math.floor((hopSize / 1000) * sampleRate);

        let lastValidHz = null;
        for (let i = 0; i < channelData.length - winSamples; i += hopSamples) {
            const timeMs = (i / sampleRate) * 1000;
            const chunk = channelData.subarray(i, i + winSamples);
            let hz = detectPitch(chunk);

            if (hz && lastValidHz) {
                const ratio = hz / lastValidHz;
                if (Math.abs(ratio - 2) < 0.1) hz = hz / 2;
                else if (Math.abs(ratio - 0.5) < 0.1) hz = hz * 2;
            }

            if (hz) {
                // Looser jump rejection (0.4 octaves) to allow for fast note transitions
                if (lastValidHz && Math.abs(Math.log2(hz / lastValidHz)) > 0.4) {
                    hz = null;
                } else {
                    lastValidHz = hz;
                }
            }

            curve.push({ time: timeMs, hz: hz });
        }

        // Post-process: Refined smoothing
        // 1. Median filter (removes spikes)
        let processed = curve.map((pt, idx) => {
            const windowSize = 5;
            const half = Math.floor(windowSize / 2);
            const start = Math.max(0, idx - half);
            const end = Math.min(curve.length, idx + half + 1);
            const window = curve.slice(start, end).map(p => p.hz).filter(h => h !== null).sort((a, b) => a - b);

            if (window.length >= 3) {
                return { ...pt, hz: window[Math.floor(window.length / 2)] };
            }
            return pt;
        });

        // 2. Linear Interpolation for small gaps (bridging up to 100ms)
        for (let i = 1; i < processed.length - 1; i++) {
            if (processed[i].hz === null && processed[i - 1].hz !== null) {
                let nextIdx = -1;
                // Look ahead up to 4 samples (100ms at 25ms hop)
                for (let j = i + 1; j < Math.min(processed.length, i + 5); j++) {
                    if (processed[j].hz !== null) {
                        nextIdx = j;
                        break;
                    }
                }
                if (nextIdx !== -1) {
                    const prevHz = processed[i - 1].hz;
                    const nextHz = processed[nextIdx].hz;
                    const gap = nextIdx - (i - 1);
                    for (let k = 0; k < gap - 1; k++) {
                        processed[i + k].hz = prevHz + (nextHz - prevHz) * ((k + 1) / gap);
                    }
                    i = nextIdx - 1;
                }
            }
        }

        currentSampleRate = originalSampleRate;
        tempCtx.close();

        return processed;
    } catch (err) {
        console.error("Failed to extract pitch curve offline:", err);
        return [];
    }
}
