/**
 * Convert a pointer position inside the split area to the right-pane percentage.
 *
 * `splitRatio` stores the right pane width, while the pointer position is the
 * divider's left offset. Keeping this inversion in one place prevents the
 * divider from moving in the opposite direction of the pointer.
 */
export function splitRatioFromPointer(
  clientX: number,
  left: number,
  width: number,
): number {
  const pointerPercent = ((clientX - left) / Math.max(1, width)) * 100;
  return Math.min(72, Math.max(28, 100 - pointerPercent));
}
