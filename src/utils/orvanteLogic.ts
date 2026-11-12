/**
 * Pure calculation utilities for Orvante monochrome landing page animations:
 * - Statement word-by-word grey (#6f6f6f) to white (#f4f4f4) interpolation with 3-word soft edge
 * - Counter easing and formatting (400+, 230+, 56M+, 10+)
 * - Recorder (?rec=1) timeline progress calculations
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const STATEMENT_GREY: RGB = { r: 111, g: 111, b: 111 }; // #6f6f6f
export const STATEMENT_WHITE: RGB = { r: 244, g: 244, b: 244 }; // #f4f4f4

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

/**
 * Computes the fill factor [0..1] for word `wordIndex` out of `totalWords`
 * given an overall section progress `progress` in [0..1] and a `softEdgeWords` width (default 3).
 *
 * At progress = 0, all words have fill = 0 (#6f6f6f).
 * At progress = 1, all words have fill = 1 (#f4f4f4).
 * In between, the active front sweeps across [0, totalWords + softEdgeWords] so the transition
 * spans `softEdgeWords` consecutive words smoothly.
 */
export function computeWordFillFactor(
  wordIndex: number,
  totalWords: number,
  progress: number,
  softEdgeWords: number = 3
): number {
  if (totalWords <= 0) return 1;
  const p = clamp01(progress);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const edge = Math.max(1, softEdgeWords);
  const cursor = p * (totalWords + edge);
  const raw = (cursor - wordIndex) / edge;
  return clamp01(raw);
}

/**
 * Interpolates between #6f6f6f and #f4f4f4 based on a word's fill factor [0..1].
 */
export function interpolateWordColor(fillFactor: number): string {
  const f = clamp01(fillFactor);
  const r = Math.round(STATEMENT_GREY.r + (STATEMENT_WHITE.r - STATEMENT_GREY.r) * f);
  const g = Math.round(STATEMENT_GREY.g + (STATEMENT_WHITE.g - STATEMENT_GREY.g) * f);
  const b = Math.round(STATEMENT_GREY.b + (STATEMENT_WHITE.b - STATEMENT_GREY.b) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Formats a counter value given target integer, current progress [0..1], and suffix (e.g. "+", "M+").
 */
export function formatCounterValue(target: number, progress: number, suffix: string = '+'): string {
  const eased = easeOutCubic(progress);
  const current = Math.round(target * eased);
  return `${current}${suffix}`;
}

/**
 * Computes recorder mode (?rec=1) normalized progress values for a given elapsed time in seconds.
 * - Statement fill: 1.3s - 4.2s
 * - Trust counters & avatars: 3.5s - 5.2s
 * - Awards card lift: >= 5.3s
 */
export function computeRecorderState(elapsedSeconds: number): {
  statementProgress: number;
  trustProgress: number;
  awardsLifted: boolean;
  photoDriftPx: number;
} {
  const t = Math.max(0, elapsedSeconds);
  const statementProgress = clamp01((t - 1.3) / (4.2 - 1.3));
  const trustProgress = clamp01((t - 3.5) / (5.2 - 3.5));
  const awardsLifted = t >= 5.3;
  const photoDriftPx = Math.min(t * 9.5, 64);
  return {
    statementProgress,
    trustProgress,
    awardsLifted,
    photoDriftPx,
  };
}
