import { describe, expect, it } from 'vitest';
import { splitRatioFromPointer } from './splitPane';

describe('splitRatioFromPointer', () => {
  it('moves the right pane in the same direction as the pointer', () => {
    expect(splitRatioFromPointer(250, 0, 1000)).toBe(72);
    expect(splitRatioFromPointer(500, 0, 1000)).toBe(50);
    expect(splitRatioFromPointer(750, 0, 1000)).toBe(28);
  });

  it('accounts for the split area left offset and clamps the range', () => {
    expect(splitRatioFromPointer(350, 100, 1000)).toBe(72);
    expect(splitRatioFromPointer(600, 100, 1000)).toBe(50);
    expect(splitRatioFromPointer(900, 100, 1000)).toBe(28);
  });
});
