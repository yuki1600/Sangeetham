/**
 * Shared playback / notation rendering constants.
 *
 * Centralized so NotationLane, WaveformEditor, and EditorSongView agree
 * on pixel scale, playhead position, and the default avartana duration.
 */

/** Pixels per second of audio in the notation/waveform timeline. */
export const PX_PER_SEC = 100;

/** Fraction of the viewport width where the playhead sits (0 = left, 1 = right). */
export const PLAYHEAD = 0.125;

/** Default avartana length in seconds when no calibration is saved. */
export const DEFAULT_AAVARTANA_SEC = 4.0;
