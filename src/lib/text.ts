export function countCharacters(text: string): number {
  return Array.from(text.replace(/\s/g, '')).length;
}

export function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

export function excerpt(text: string, length = 42): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '空白章节';
  return compact.length > length ? `${compact.slice(0, length)}…` : compact;
}
