import { describe, expect, it } from 'vitest';
import { collectProofreadingIssues } from './rules';

describe('Chinese proofreading rules', () => {
  it('flags obvious duplicated function characters but not normal reduplication', () => {
    const issues = collectProofreadingIssues('我们的的稿子。');
    expect(issues.some((issue) => issue.rule === 'repeated-char' && issue.text === '的的')).toBe(true);
    expect(collectProofreadingIssues('他慢慢地走来，人人皆知。')).toHaveLength(0);
    expect(collectProofreadingIssues('研究研究再说。')).toHaveLength(0);
  });

  it('avoids common word-boundary false positives', () => {
    expect(collectProofreadingIssues('目的的确不同。')).toHaveLength(0);
    expect(collectProofreadingIssues('土地地面很宽。')).toHaveLength(0);
  });

  it('flags repeated phrases and consecutive punctuation', () => {
    const phrase = collectProofreadingIssues('我们的我们的稿子。');
    expect(phrase.some((issue) => issue.rule === 'repeated-word')).toBe(true);
    const punctuation = collectProofreadingIssues('等一下，，马上。');
    expect(punctuation.some((issue) => issue.text === '，，')).toBe(true);
    expect(collectProofreadingIssues('等等……')).toHaveLength(0);
  });

  it('detects unmatched Chinese quotation marks', () => {
    const issues = collectProofreadingIssues('他说：“你好。');
    expect(issues.some((issue) => issue.rule === 'punctuation-pair')).toBe(true);
    expect(collectProofreadingIssues('他说：“你好。”')).toHaveLength(0);
  });

  it('flags English punctuation inside Chinese but not English-only text', () => {
    const issues = collectProofreadingIssues('这是中文,错误。');
    expect(issues.some((issue) => issue.rule === 'mixed-punctuation' && issue.text === ',')).toBe(true);
    expect(collectProofreadingIssues('hello, world.')).toHaveLength(0);
  });

  it('checks ellipsis and multiple spaces without overlapping issues', () => {
    const ellipsis = collectProofreadingIssues('中文...结束');
    expect(ellipsis.some((issue) => issue.rule === 'ellipsis')).toBe(true);
    expect(ellipsis.some((issue) => issue.rule === 'punctuation-repeat')).toBe(false);
    const spaces = collectProofreadingIssues('中文  空格');
    expect(spaces.some((issue) => issue.rule === 'format-space')).toBe(true);
  });

  it('supports personal dictionary and ignore fingerprints', () => {
    const first = collectProofreadingIssues('我们的的稿子。');
    const issue = first.find((entry) => entry.text === '的的');
    expect(issue).toBeTruthy();
    expect(
      collectProofreadingIssues('我们的的稿子。', { dictionary: ['的'] }),
    ).toHaveLength(0);
    expect(
      collectProofreadingIssues('我们的的稿子。', {
        ignored: issue ? [issue.fingerprint] : [],
      }),
    ).toHaveLength(0);
  });

  it('ignores URLs and stays linear on a long paragraph', () => {
    expect(collectProofreadingIssues('访问 https://example.com/a,b 获取。')).toHaveLength(0);
    const long = '这是一个用于检查性能的普通中文句子。'.repeat(500);
    const start = performance.now();
    collectProofreadingIssues(long);
    expect(performance.now() - start).toBeLessThan(100);
  });
});
