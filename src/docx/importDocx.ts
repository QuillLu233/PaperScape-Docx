import * as mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { generateJSON, type JSONContent } from '@tiptap/core';
import { createEditorExtensions } from '../editor/editorConfig';
import { countCharacters, excerpt } from '../lib/text';
import { htmlToPlainText } from '../lib/richText';

export interface ImportedDocx {
  title: string;
  html: string;
  doc: JSONContent;
  text: string;
  characterCount: number;
  excerpt: string;
  warnings: string[];
  imageCount: number;
  tableCount: number;
}

const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
  'b => strong',
  'i => em',
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  'text-align',
  'text-indent',
  'margin-left',
  'line-height',
  'font-weight',
  'font-style',
  'font-size',
  'color',
]);

const SAFE_STYLE_VALUE = /^(?!.*(?:url\(|expression|javascript:|@import))[^;]+$/i;

function sanitizeStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const source = element.getAttribute('style') ?? '';
    const safe: string[] = [];
    for (const declaration of source.split(';')) {
      const separator = declaration.indexOf(':');
      if (separator < 1) continue;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (ALLOWED_STYLE_PROPERTIES.has(property) && SAFE_STYLE_VALUE.test(value)) {
        safe.push(`${property}: ${value}`);
      }
    }
    if (safe.length > 0) element.setAttribute('style', safe.join('; '));
    else element.removeAttribute('style');
  });
}

/**
 * Mammoth emits semantic HTML. Sanitize it before Tiptap ever parses it, and
 * keep only self-contained image data (never external URLs).
 */
export function sanitizeDocxHtml(rawHtml: string): string {
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'svg', 'math'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc', 'formaction'],
    ADD_DATA_URI_TAGS: ['img'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
  const container = document.createElement('div');
  container.innerHTML = sanitized;

  container.querySelectorAll('img').forEach((image) => {
    const source = image.getAttribute('src') ?? '';
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source) || source.length > 12_000_000) {
      image.remove();
      return;
    }
    image.removeAttribute('srcset');
    image.removeAttribute('style');
  });

  container.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!/^(https?:|mailto:|tel:)/i.test(href)) link.removeAttribute('href');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  });

  container.querySelectorAll('*').forEach((element) => {
    element.removeAttribute('id');
    element.removeAttribute('contenteditable');
  });
  sanitizeStyles(container);
  return container.innerHTML;
}

export async function importDocx(file: File): Promise<ImportedDocx> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('请选择 .docx 文件（不支持把 .doc 或 HTML 改扩展名）');
  }
  if (file.size > 80 * 1024 * 1024) {
    throw new Error('DOCX 文件超过 80 MB，已拒绝导入');
  }
  const arrayBuffer = await file.arrayBuffer();
  const input =
    typeof Buffer !== 'undefined'
      ? { buffer: Buffer.from(arrayBuffer) }
      : { arrayBuffer };
  const result = await mammoth.convertToHtml(
    input,
    {
      includeDefaultStyleMap: true,
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement(async (image) => {
        const contentType = image.contentType || 'image/png';
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(contentType)) {
          return { src: '' };
        }
        const base64 = await image.read('base64');
        return { src: `data:${contentType};base64,${base64}` };
      }),
    },
  );

  const html = sanitizeDocxHtml(result.value);
  const doc = generateJSON(html, createEditorExtensions()) as JSONContent;
  const text = htmlToPlainText(html);
  const warnings = result.messages
    .filter((message) => message.type === 'warning' || message.type === 'error')
    .map((message) => message.message)
    .filter((message, index, all) => all.indexOf(message) === index);
  warnings.push(
    '导入不会包含：页眉页脚、批注、修订记录、复杂公式、文本框、宏、嵌入对象和 Word 页面背景。',
  );

  const preview = document.createElement('div');
  preview.innerHTML = html;
  const imageCount = preview.querySelectorAll('img').length;
  const tableCount = preview.querySelectorAll('table').length;

  return {
    title: file.name.replace(/\.docx$/i, '').trim() || '导入的 Word 文档',
    html,
    doc,
    text,
    characterCount: countCharacters(text),
    excerpt: excerpt(text),
    warnings,
    imageCount,
    tableCount,
  };
}
