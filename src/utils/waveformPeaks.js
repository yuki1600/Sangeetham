/**
 * Downsample an AudioBuffer to a fixed number of peak amplitude samples.
 * Used by WaveformEditor (Sound Track) and MinimapTrack (Bottom Bar) so
 * the same peak data drives both views.
 *
 * @param {AudioBuffer} audioBuffer  the source buffer
 * @param {number} target            number of output samples (default 4000)
 * @returns {{ samples: Float32Array, duration: number } | null}
 *
 * Each sample is `max(|raw|)` over its corresponding window of the source
 * buffer's channel-0 data — a fast approximation of the peak envelope that
 * scales linearly with target size.
 */
export function extractPeaks(audioBuffer, target = 4000) {
    if (!audioBuffer) return null;
    const raw = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(raw.length / target));
    const samples = new Float32Array(target);
    for (let i = 0; i < target; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) {
            const v = Math.abs(raw[i * step + j] || 0);
            if (v > max) max = v;
        }
        samples[i] = max;
    }
    return { samples, duration: audioBuffer.duration };
}
