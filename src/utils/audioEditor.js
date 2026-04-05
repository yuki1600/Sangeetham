/**
 * Applies trim + cut edit operations to an AudioBuffer using OfflineAudioContext.
 * Non-destructive: original buffer is never modified.
 *
 * @param {AudioBuffer} audioBuffer - The original decoded audio
 * @param {{ trimStart?: number, trimEnd?: number|null, cuts?: Array<{start:number,end:number}> }} editOps
 * @returns {Promise<AudioBuffer>} - New AudioBuffer with edits applied
 */
export async function applyEditOps(audioBuffer, editOps) {
  if (!window.OfflineAudioContext) {
    throw new Error('OfflineAudioContext not supported in this browser');
  }

  const { trimStart = 0, trimEnd = null, cuts = [] } = editOps || {};
  const end = (trimEnd != null && trimEnd > 0) ? trimEnd : audioBuffer.duration;

  const segments = buildSegments(Math.max(0, trimStart), Math.min(end, audioBuffer.duration), cuts);

  const outputDuration = segments.reduce((s, seg) => s + (seg.end - seg.start), 0);

  if (outputDuration <= 0) {
    // Return a silent 0.1s buffer if everything is cut
    const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.sampleRate * 0.1, audioBuffer.sampleRate);
    return ctx.startRendering();
  }

  const ctx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.max(1, Math.ceil(outputDuration * audioBuffer.sampleRate)),
    audioBuffer.sampleRate
  );

  let writeOffset = 0;
  for (const seg of segments) {
    const duration = seg.end - seg.start;
    if (duration <= 0) continue;
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.start(writeOffset, seg.start, duration);
    writeOffset += duration;
  }

  return ctx.startRendering();
}

/**
 * Computes the list of audio segments to keep after applying cuts within [trimStart, trimEnd].
 */
function buildSegments(trimStart, trimEnd, cuts) {
  let segs = [{ start: trimStart, end: trimEnd }];

  for (const cut of cuts) {
    const next = [];
    for (const seg of segs) {
      const cs = Math.max(cut.start, seg.start);
      const ce = Math.min(cut.end, seg.end);
      if (cs >= ce) {
        next.push(seg);
        continue;
      }
      if (seg.start < cs) next.push({ start: seg.start, end: cs });
      if (ce < seg.end) next.push({ start: ce, end: seg.end });
    }
    segs = next;
  }

  return segs.filter(s => s.end > s.start);
}

/**
 * Maps a time position in the edited (post-trim/cut) timeline back to its
 * corresponding position in the original audio timeline.
 */
export function editedTimeToOriginal(editedTime, originalDuration, editOps) {
  const { trimStart = 0, trimEnd = null, cuts = [] } = editOps || {};
  const end = (trimEnd != null && trimEnd > 0) ? trimEnd : originalDuration;
  const segments = buildSegments(Math.max(0, trimStart), Math.min(end, originalDuration), cuts);

  let accumulated = 0;
  for (const seg of segments) {
    const segDur = seg.end - seg.start;
    if (accumulated + segDur >= editedTime) {
      return seg.start + (editedTime - accumulated);
    }
    accumulated += segDur;
  }
  // Past the end — clamp to last segment end
  return segments.length > 0 ? segments[segments.length - 1].end : trimStart;
}

/**
 * Returns the total output duration after applying edit ops (without actually rendering).
 */
export function getEditedDuration(originalDuration, editOps) {
  const { trimStart = 0, trimEnd = null, cuts = [] } = editOps || {};
  const end = (trimEnd != null && trimEnd > 0) ? trimEnd : originalDuration;
  const clampedEnd = Math.min(end, originalDuration);
  const clampedStart = Math.max(0, trimStart);
  const segments = buildSegments(clampedStart, clampedEnd, cuts);
  return segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
}
