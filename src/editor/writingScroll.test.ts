import { describe, expect, it } from 'vitest';
import { getCaretFollowDelta, getWritingSpace } from './writingScroll';

describe('comfortable writing scroll', () => {
  it('reserves a quarter viewport below the document, compensating for zoom', () => {
    expect(getWritingSpace(800, 1)).toBe(200);
    expect(getWritingSpace(800, 1.25)).toBe(160);
    expect(getWritingSpace(800, 0.5)).toBe(400);
    expect(getWritingSpace(0, 1)).toBe(0);
  });

  it('only scrolls after the caret enters the bottom buffer', () => {
    expect(getCaretFollowDelta(590, 0, 800)).toBe(0);
    expect(getCaretFollowDelta(640, 0, 800)).toBe(80);
    expect(getCaretFollowDelta(760, 20, 800)).toBe(180);
  });
});
