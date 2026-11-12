import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type ParagraphChild,
} from 'docx';
import type { JSONContent } from '@tiptap/core';

export type DocxPreset = 'standard' | 'novel';
export type DocxPageSize = 'A4' | 'Letter';

export interface DocxExportChapter {
  title: string;
  doc: JSONContent;
}

export interface DocxExportOptions {
  preset: DocxPreset;
  pageSize: DocxPageSize;
  fontFamily: string;
  fontSize: number;
  includeTitle: boolean;
}

export interface DocxExportResult {
  data: Uint8Array;
  skippedImages: number;
}

const PAGE_SIZES = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

const NUMBERING_REFERENCE = 'paperscape-ordered-list';

function firstFontFamily(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const first = value.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return first || undefined;
}

function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/#([0-9a-f]{6})/i);
  return match ? match[1].toUpperCase() : undefined;
}

function fontSizeToHalfPoints(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 2) : fallback;
}

function paragraphAlignment(value: unknown) {
  if (value === 'center') return AlignmentType.CENTER;
  if (value === 'right') return AlignmentType.RIGHT;
  if (value === 'justify') return AlignmentType.JUSTIFIED;
  return undefined;
}

interface RunContext {
  fontFamily: string;
  fontSize: number;
}

function textRuns(
  node: JSONContent,
  context: RunContext,
  skipped: { count: number },
): ParagraphChild[] {
  const marks = node.marks ?? [];
  const textStyle = marks.find((mark) => mark.type === 'textStyle')?.attrs ?? {};
  const font = firstFontFamily(textStyle.fontFamily) ?? context.fontFamily;
  const size = fontSizeToHalfPoints(textStyle.fontSize, context.fontSize * 2);
  const color = normalizeColor(textStyle.color);
  const run = new TextRun({
    text: node.text ?? '',
    bold: marks.some((mark) => mark.type === 'bold'),
    italics: marks.some((mark) => mark.type === 'italic'),
    strike: marks.some((mark) => mark.type === 'strike'),
    underline: marks.some((mark) => mark.type === 'underline')
      ? { type: UnderlineType.SINGLE }
      : undefined,
    font,
    size,
    color,
  });
  const link = marks.find((mark) => mark.type === 'link')?.attrs?.href;
  if (typeof link === 'string' && /^(https?:|mailto:)/i.test(link)) {
    return [new ExternalHyperlink({ link, children: [run] })];
  }
  if (node.type === 'hardBreak') {
    return [new TextRun({ break: 1 })];
  }
  if (node.type === 'image') {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
    const match = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,/i);
    if (!match) {
      skipped.count += 1;
      return [];
    }
    const type = match[1].toLowerCase().replace('jpeg', 'jpg') as 'png' | 'jpg' | 'gif' | 'bmp';
    const width = Number(node.attrs?.width) || 480;
    const height = Number(node.attrs?.height) || Math.round(width * 0.66);
    return [
      new ImageRun({
        type,
        data: src,
        transformation: { width: Math.min(width, 520), height: Math.min(height, 520) },
        altText: {
          title: typeof node.attrs?.alt === 'string' ? node.attrs.alt : '文档图片',
          description: typeof node.attrs?.title === 'string' ? node.attrs.title : '',
          name: 'paperscape-image',
        },
      }),
    ];
  }
  return [run];
}

function inlineChildren(
  nodes: JSONContent[] | undefined,
  context: RunContext,
  skipped: { count: number },
): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  for (const node of nodes ?? []) {
    children.push(...textRuns(node, context, skipped));
  }
  return children;
}

function headingFor(level: unknown) {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

function paragraphOptions(
  node: JSONContent,
  options: DocxExportOptions,
  context: RunContext,
  skipped: { count: number },
  pageBreakBefore = false,
) {
  const attrs = node.attrs ?? {};
  const lineHeight =
    typeof attrs.lineHeight === 'string' ? Number.parseFloat(attrs.lineHeight) : undefined;
  const normalizedLineHeight =
    typeof lineHeight === 'number' && Number.isFinite(lineHeight) ? lineHeight : 1.5;
  return {
    children: inlineChildren(node.content, context, skipped),
    heading: node.type === 'heading' ? headingFor(attrs.level) : undefined,
    alignment: paragraphAlignment(attrs.textAlign),
    pageBreakBefore,
    spacing: {
      line: Math.round(240 * normalizedLineHeight),
      after: 120,
    },
    indent:
      options.preset === 'novel' && node.type === 'paragraph'
        ? { firstLine: 480 }
        : undefined,
  };
}

function collectListParagraphs(
  list: JSONContent,
  level: number,
  options: DocxExportOptions,
  context: RunContext,
  skipped: { count: number },
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const item of list.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type === 'paragraph') {
        paragraphs.push(
          new Paragraph({
            children: inlineChildren(child.content, context, skipped),
            ...(list.type === 'orderedList'
              ? {
                  numbering: { reference: NUMBERING_REFERENCE, level: Math.min(level, 8) },
                }
              : { bullet: { level: Math.min(level, 8) } }),
            spacing: { line: 360, after: 80 },
          }),
        );
      } else if (child.type === 'bulletList' || child.type === 'orderedList') {
        paragraphs.push(
          ...collectListParagraphs(child, level + 1, options, context, skipped),
        );
      } else if (child.type === 'table') {
        // Word tables inside list items are uncommon and not part of the
        // current Tiptap schema round-trip; count them as an unsupported loss.
        skipped.count += 1;
      }
    }
  }
  return paragraphs;
}

function tableFor(
  node: JSONContent,
  options: DocxExportOptions,
  context: RunContext,
  skipped: { count: number },
): Table {
  const rows = (node.content ?? []).map(
    (row) =>
      new TableRow({
        children: (row.content ?? []).map(
          (cell) =>
            new TableCell({
              width: { size: 100 / Math.max(1, row.content?.length ?? 1), type: WidthType.PERCENTAGE },
              children:
                (cell.content ?? []).flatMap((child) => {
                  if (child.type === 'paragraph') {
                    return [
                      new Paragraph({
                        children: inlineChildren(child.content, context, skipped),
                        spacing: { after: 40 },
                      }),
                    ];
                  }
                  if (child.type === 'bulletList' || child.type === 'orderedList') {
                    return collectListParagraphs(child, 0, options, context, skipped);
                  }
                  return [];
                }),
            }),
        ),
      }),
  );
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'B8B2A5' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B8B2A5' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'B8B2A5' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'B8B2A5' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D8D2C5' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D8D2C5' },
    },
  });
}

function titleParagraph(
  title: string,
  options: DocxExportOptions,
  context: RunContext,
  pageBreakBefore: boolean,
): Paragraph {
  return new Paragraph({
    pageBreakBefore,
    alignment: options.preset === 'novel' ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 240, after: 240 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        font: context.fontFamily,
        size: 36,
      }),
    ],
  });
}

function chapterChildren(
  chapter: DocxExportChapter,
  chapterIndex: number,
  options: DocxExportOptions,
  context: RunContext,
  skipped: { count: number },
): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];
  if (options.includeTitle) {
    children.push(titleParagraph(chapter.title, options, context, chapterIndex > 0));
  }
  for (const node of chapter.doc.content ?? []) {
    if (node.type === 'paragraph') {
      children.push(new Paragraph(paragraphOptions(node, options, context, skipped)));
    } else if (node.type === 'heading') {
      children.push(new Paragraph(paragraphOptions(node, options, context, skipped)));
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      children.push(...collectListParagraphs(node, 0, options, context, skipped));
    } else if (node.type === 'table') {
      children.push(tableFor(node, options, context, skipped));
    } else if (node.type === 'image') {
      children.push(
        new Paragraph({
          children: textRuns(node, context, skipped),
          spacing: { after: 120 },
        }),
      );
    } else if (node.type === 'blockquote') {
      for (const child of node.content ?? []) {
        if (child.type === 'paragraph') {
          children.push(
            new Paragraph({
              ...paragraphOptions(child, options, context, skipped),
              indent: { left: 480 },
            }),
          );
        }
      }
    }
  }
  return children;
}

function buildDocument(
  chapters: DocxExportChapter[],
  options: DocxExportOptions,
  skipped: { count: number },
): Document {
  const page = PAGE_SIZES[options.pageSize];
  const novel = options.preset === 'novel';
  const context: RunContext = {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
  };
  const margins = novel
    ? { top: 1800, right: 1440, bottom: 1800, left: 1440 }
    : { top: 1440, right: 1440, bottom: 1440, left: 1440 };
  const children = chapters.flatMap((chapter, index) =>
    chapterChildren(chapter, index, options, context, skipped),
  );
  return new Document({
    creator: 'PaperScape',
    title: chapters.length === 1 ? chapters[0].title : 'PaperScape 稿件',
    description: '由 PaperScape 导出的 Office Open XML 文档',
    styles: {
      default: {
        document: {
          run: {
            font: options.fontFamily,
            size: options.fontSize * 2,
            language: { value: 'zh-CN' },
          },
          paragraph: {
            spacing: { line: novel ? 360 : 276, after: 120 },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: NUMBERING_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: '%2.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 1080, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: page,
            margin: margins,
          },
        },
        children,
      },
    ],
  });
}

/** Packer.toBuffer works in Node and in the WebView bundle. */
export async function buildDocxBuffer(
  chapters: DocxExportChapter[],
  options: DocxExportOptions,
): Promise<DocxExportResult> {
  const skipped = { count: 0 };
  const document = buildDocument(chapters, options, skipped);
  const buffer = await Packer.toBuffer(document);
  return {
    data: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    skippedImages: skipped.count,
  };
}

export async function buildDocxBlob(
  chapters: DocxExportChapter[],
  options: DocxExportOptions,
): Promise<{ blob: Blob; skippedImages: number }> {
  const skipped = { count: 0 };
  const document = buildDocument(chapters, options, skipped);
  const blob = await Packer.toBlob(document);
  return { blob, skippedImages: skipped.count };
}
