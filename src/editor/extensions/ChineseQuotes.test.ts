import { describe, expect, it } from 'vitest';
import { normalizeChineseQuote } from './ChineseQuotes';

describe('Chinese quote input direction', () => {
  it('opens a quoted passage at a paragraph start or after a colon', () => {
    expect(normalizeChineseQuote('', '源氏。', '”')).toBe('“');
    expect(normalizeChineseQuote('他说：', '你好', '”')).toBe('“');
    expect(normalizeChineseQuote('', '你好', '“')).toBe('“');
  });

  it('closes an already opened quote after body text', () => {
    expect(normalizeChineseQuote('“源氏。', '千鸟匠', '“')).toBe('”');
    expect(normalizeChineseQuote('“你好', '', '“')).toBe('”');
    expect(normalizeChineseQuote('“你好', '。', '“')).toBe('”');
  });

  it('allows a nested quotation after a colon', () => {
    expect(normalizeChineseQuote('“他说：', '你好', '”')).toBe('“');
  });

  it('leaves ambiguous prose unchanged', () => {
    expect(normalizeChineseQuote('他说。', '源氏', '“')).toBe('“');
    expect(normalizeChineseQuote('“源氏。', '千鸟匠', '”')).toBe('”');
  });
});
