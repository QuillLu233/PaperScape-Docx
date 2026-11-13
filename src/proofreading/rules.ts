export type ProofreadingRule =
  | 'repeated-char'
  | 'repeated-word'
  | 'punctuation-repeat'
  | 'punctuation-pair'
  | 'mixed-punctuation'
  | 'format-space'
  | 'ellipsis';

export interface ProofreadingIssue {
  id: string;
  rule: ProofreadingRule;
  from: number;
  to: number;
  text: string;
  word?: string;
  message: string;
  suggestion?: string;
  fingerprint: string;
}

export interface ProofreadingOptions {
  dictionary?: string[];
  ignored?: string[];
  maxIssues?: number;
}

const CJK = /[\u3400-\u9fff]/;
const FUNCTION_CHARS = new Set('的了是我你他她它这那就都也又很不没和与把被让给从向对为以之而但却并或如若因所地着过吗呢吧啊呀哦嗯'.split(''));
const PRONOUN_WORDS =
  /(我们|你们|他们|她们|它们|自己|这个|那个|一个|没有|就是|还是|但是|因为|所以|如果|虽然|而且|然后|已经|可以|应该|什么|怎么|这样|那样|这里|那里)\1/g;
const CLOSED_PAIRS: Array<[string, string]> = [
  ['“', '”'],
  ['‘', '’'],
  ['（', '）'],
  ['【', '】'],
  ['《', '》'],
  ['「', '」'],
  ['『', '』'],
  ['〈', '〉'],
];
const MIXED_PUNCTUATION: Record<string, string> = {
  ',': '，',
  '.': '。',
  ';': '；',
  ':': '：',
  '?': '？',
  '!': '！',
};

/** Protected spans (URLs, e-mail addresses) must not trigger Chinese punctuation rules. */
function maskProtected(text: string): string {
  return text.replace(
    /https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w.-]+\.\w+/gi,
    (value) => '\u0001'.repeat(value.length),
  );
}

function contextOf(text: string, from: number, to: number): string {
  return `${text.slice(Math.max(0, from - 6), from)}\u0001${text.slice(to, to + 6)}`;
}

function fingerprint(rule: ProofreadingRule, text: string, from: number, to: number): string {
  return `${rule}\u0002${text}\u0002${contextOf(text, from, to)}`;
}

/** Avoid the most common legitimate two-character boundary cases. */
function isLikelyBoundary(text: string, index: number): boolean {
  const left = text[index - 1] ?? '';
  const right = text[index + 2] ?? '';
  if (text[index] === '的' && left === '目') return true;
  if (text[index] === '地' && (left === '土' || left === '大')) return true;
  if (text[index] === '得' && '觉获使得懂记取显值'.includes(left)) return true;
  if (text[index] === '了' && left === '为' && right === '解') return true;
  if (text[index] === '是' && '但还就只可总于要算硬正不'.includes(left)) return true;
  return false;
}

export function collectProofreadingIssues(
  source: string,
  options: ProofreadingOptions = {},
): ProofreadingIssue[] {
  const text = maskProtected(source);
  if (!CJK.test(text)) return [];
  const maxIssues = Math.max(1, Math.min(options.maxIssues ?? 30, 80));
  const dictionary = new Set((options.dictionary ?? []).map((word) => word.trim()).filter(Boolean));
  const ignored = new Set(options.ignored ?? []);
  const issues: ProofreadingIssue[] = [];

  const add = (
    rule: ProofreadingRule,
    from: number,
    to: number,
    textValue: string,
    message: string,
    suggestion?: string,
    word?: string,
  ) => {
    if (issues.length >= maxIssues || to <= from) return;
    if (issues.some((issue) => from < issue.to && to > issue.from)) return;
    if (word && (dictionary.has(word) || dictionary.has(textValue))) return;
    const key = fingerprint(rule, textValue, from, to);
    if (ignored.has(key)) return;
    issues.push({
      id: `${rule}-${from}-${to}`,
      rule,
      from,
      to,
      text: source.slice(from, to),
      word,
      message,
      suggestion,
      fingerprint: key,
    });
  };

  // Repeated three-or-more-character phrases ("我们的我们的") are almost always errors.
  for (const match of text.matchAll(/([\u3400-\u9fff]{3,8})\1/g)) {
    if (match.index === undefined) continue;
    const word = match[1];
    add(
      'repeated-word',
      match.index,
      match.index + match[0].length,
      match[0],
      `疑似重复了“${word}”。`,
      `可删除后一个“${word}”。`,
      word,
    );
  }

  // Repeated two-character function words ("我们我们").
  for (const match of text.matchAll(PRONOUN_WORDS)) {
    if (match.index === undefined) continue;
    add(
      'repeated-word',
      match.index,
      match.index + match[0].length,
      match[0],
      `疑似重复了“${match[1]}”。`,
      `可删除后一个“${match[1]}”。`,
      match[1],
    );
  }

  // Obvious duplicated function characters ("的的", "就就").
  for (let index = 0; index < text.length - 1; index += 1) {
    const char = text[index];
    if (!FUNCTION_CHARS.has(char) || text[index + 1] !== char) continue;
    if (isLikelyBoundary(text, index)) continue;
    add(
      'repeated-char',
      index,
      index + 2,
      `${char}${char}`,
      `疑似重复字：“${char}${char}”。`,
      `可删除一个“${char}”。`,
      char,
    );
  }

  // Consecutive Chinese punctuation.
  for (const match of text.matchAll(/([，。；：！？、])\1+/g)) {
    if (match.index === undefined) continue;
    add(
      'punctuation-repeat',
      match.index,
      match.index + match[0].length,
      match[0],
      `连续重复标点“${match[0]}”。`,
      '通常保留一个标点。',
    );
  }

  // Consecutive English punctuation; "." runs of 3+ are handled as ellipsis.
  for (const match of text.matchAll(/([,;:!?])\1+/g)) {
    if (match.index === undefined) continue;
    add(
      'punctuation-repeat',
      match.index,
      match.index + match[0].length,
      match[0],
      `连续重复标点“${match[0]}”。`,
      '通常保留一个标点。',
    );
  }
  for (const match of text.matchAll(/\.{2,}/g)) {
    if (match.index === undefined || match[0].length >= 3) continue;
    add(
      'punctuation-repeat',
      match.index,
      match.index + match[0].length,
      match[0],
      '连续重复英文句点。',
      '通常保留一个句点。',
    );
  }

  // Chinese punctuation pairs within the current paragraph.
  const stack: Array<{ open: string; close: string; index: number }> = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const pair = CLOSED_PAIRS.find(([open, close]) => open === char || close === char);
    if (!pair) continue;
    if (pair[0] === char) {
      stack.push({ open: pair[0], close: pair[1], index });
      continue;
    }
    const top = stack[stack.length - 1];
    if (top && top.close === char) {
      stack.pop();
    } else {
      add(
        'punctuation-pair',
        index,
        index + 1,
        char,
        `“${char}”缺少对应的前引/前括号。`,
        `检查“${pair[0]}${pair[1]}”的配对。`,
      );
    }
  }
  for (const unclosed of stack) {
    add(
      'punctuation-pair',
      unclosed.index,
      unclosed.index + 1,
      unclosed.open,
      `“${unclosed.open}”没有闭合。`,
      `补充对应的“${unclosed.close}”。`,
    );
  }

  // English ellipsis in a Chinese context.
  for (const match of text.matchAll(/\.{3,}/g)) {
    if (match.index === undefined) continue;
    const before = text[match.index - 1] ?? '';
    const after = text[match.index + match[0].length] ?? '';
    if (!CJK.test(before) && !CJK.test(after)) continue;
    add(
      'ellipsis',
      match.index,
      match.index + match[0].length,
      match[0],
      '中文里使用了英文省略号。',
      '可改为中文省略号“……”。',
    );
  }

  // English punctuation directly adjacent to Chinese characters.
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const replacement = MIXED_PUNCTUATION[char];
    if (!replacement) continue;
    if (char === '.' && (text[index - 1] === '.' || text[index + 1] === '.')) continue;
    const before = text[index - 1] ?? '';
    const after = text[index + 1] ?? '';
    if (!CJK.test(before) && !CJK.test(after)) continue;
    add(
      'mixed-punctuation',
      index,
      index + 1,
      char,
      `中文句子里使用了英文标点“${char}”。`,
      `建议改为中文标点“${replacement}”。`,
    );
  }

  // Multiple spaces inside Chinese text.
  for (const match of text.matchAll(/([\u3400-\u9fff])( {2,})(?=[\u3400-\u9fff])/g)) {
    if (match.index === undefined) continue;
    const from = match.index + 1;
    const to = from + match[2].length;
    add(
      'format-space',
      from,
      to,
      match[2],
      '中文之间出现了多个空格。',
      '可删除多余空格。',
    );
  }

  return issues.sort((left, right) => left.from - right.from);
}
