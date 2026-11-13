import JSZip from 'jszip';

export interface DocxRiskReport {
  /** True when every detected feature is supported by the current converter. */
  safeToOverwrite: boolean;
  warnings: string[];
}

const UNSUPPORTED_ENTRY_LABELS: Array<[RegExp, string]> = [
  [/^word\/header\d*\.xml$/i, '页眉'],
  [/^word\/footer\d*\.xml$/i, '页脚'],
  [/^word\/comments\.xml$/i, '批注'],
  [/^word\/vbaProject\.bin$/i, '宏'],
  [/^word\/embeddings\//i, '嵌入对象'],
  [/^word\/charts\//i, '图表'],
  [/^word\/glossary\//i, '文档部件/词汇表'],
  [/^word\/fonts\//i, '嵌入字体'],
];

const UNSUPPORTED_XML_PATTERNS: Array<[RegExp, string]> = [
  [/<w:ins\b/i, '修订插入记录'],
  [/<w:del\b/i, '修订删除记录'],
  [/<w:commentRangeStart\b/i, '批注范围'],
  [/<w:txbxContent\b/i, '文本框'],
  [/<m:oMath\b/i, '公式'],
  [/<w:altChunk\b/i, '嵌入的替代内容'],
  [/<w:object\b/i, '嵌入对象'],
  [/<wp:anchor\b/i, '浮动图片/文本框'],
  [/<w:sdt\b/i, '内容控件'],
  [/<w:trackRevisions\b/i, '修订跟踪设置'],
];

/**
 * Inspect the DOCX ZIP before allowing a destructive overwrite.
 *
 * Mammoth can read the normal body text, tables and inline images. Headers,
 * comments, tracked changes, equations, text boxes and embedded objects are
 * outside that supported surface, so the editor must not silently write a
 * simplified document over the original.
 */
export async function inspectDocxRisk(bytes: Uint8Array | ArrayBuffer): Promise<DocxRiskReport> {
  const zip = await JSZip.loadAsync(bytes);
  const warnings = new Set<string>();
  const names = Object.keys(zip.files);

  for (const name of names) {
    for (const [pattern, label] of UNSUPPORTED_ENTRY_LABELS) {
      if (pattern.test(name)) warnings.add(`包含${label}，当前编辑/导出流程无法完整保留`);
    }
  }

  const documentEntry = zip.file('word/document.xml');
  if (!documentEntry) {
    throw new Error('这不是有效的 Word DOCX：缺少 word/document.xml');
  }
  const documentXml = await documentEntry.async('string');
  for (const [pattern, label] of UNSUPPORTED_XML_PATTERNS) {
    if (pattern.test(documentXml)) warnings.add(`包含${label}，当前编辑/导出流程无法完整保留`);
  }
  const sectionCount = (documentXml.match(/<w:sectPr\b/g) || []).length;
  if (sectionCount > 1) {
    warnings.add('包含多个分节，页面设置可能无法完整保留');
  }

  // The docx library always emits empty footnote/endnote parts with separator
  // entries, so only actual notes (positive ids) count as unsupported content.
  for (const [name, tag, label] of [
    ['word/footnotes.xml', 'footnote', '脚注'],
    ['word/endnotes.xml', 'endnote', '尾注'],
  ] as const) {
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async('string');
    const ids = Array.from(
      xml.matchAll(new RegExp(`<w:${tag}\\b[^>]*w:id="(-?\\d+)"`, 'gi')),
    ).map((match) => Number(match[1]));
    if (ids.some((id) => id > 0)) {
      warnings.add(`包含${label}，当前编辑/导出流程无法完整保留`);
    }
  }

  return {
    safeToOverwrite: warnings.size === 0,
    warnings: Array.from(warnings),
  };
}
