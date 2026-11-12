const HTML_BLOCK_PATTERN = /<(p|h[1-6]|ul|ol|li|blockquote|table|img|hr|figure|pre)\b/i;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Convert legacy plain text into schema-friendly paragraphs without losing line breaks. */
export function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '';

  return normalized
    .split(/\n{2,}/)
    .filter((block) => block.length > 0)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line));
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

export function looksLikeRichText(content: string): boolean {
  return HTML_BLOCK_PATTERN.test(content) || /<strong\b|<em\b|<span\b/i.test(content);
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|blockquote|tr|div)>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>');
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  return document.body.textContent ?? '';
}

export function countCharactersFromHtml(html: string): number {
  return Array.from(htmlToPlainText(html).replace(/\s/g, '')).length;
}

export function excerptFromHtml(html: string, length = 42): string {
  const compact = htmlToPlainText(html).replace(/\s+/g, ' ').trim();
  if (!compact) return '空白章节';
  return compact.length > length ? `${compact.slice(0, length)}…` : compact;
}

export function normalizeEditorContent(content: string, version: number): string {
  if (!content) return '';
  if (version >= 2 && looksLikeRichText(content)) return content;
  if (version >= 2 && !looksLikeRichText(content)) return plainTextToHtml(content);
  return plainTextToHtml(content);
}
