export const WRITING_BUFFER_RATIO = 0.25;
export const FOLLOW_THRESHOLD_RATIO = 0.75;
export const FOLLOW_TARGET_RATIO = 0.7;

/** Viewport pixels reserved below the last line, converted back through CSS zoom. */
export function getWritingSpace(viewportHeight: number, zoom: number): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return Math.max(0, Math.round((viewportHeight * WRITING_BUFFER_RATIO) / safeZoom));
}

/** How far to scroll so the caret stays above the bottom writing buffer. */
export function getCaretFollowDelta(
  caretBottom: number,
  viewportTop: number,
  viewportHeight: number,
): number {
  if (!Number.isFinite(caretBottom) || !Number.isFinite(viewportTop) || viewportHeight <= 0) {
    return 0;
  }
  const threshold = viewportTop + viewportHeight * FOLLOW_THRESHOLD_RATIO;
  if (caretBottom <= threshold) return 0;
  const target = viewportTop + viewportHeight * FOLLOW_TARGET_RATIO;
  return Math.max(0, caretBottom - target);
}
