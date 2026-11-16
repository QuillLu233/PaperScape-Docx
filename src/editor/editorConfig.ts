import type { Extensions } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { StarterKit } from '@tiptap/starter-kit';
import { BlockStyle } from './extensions/BlockStyle';
import { ChineseQuotes } from './extensions/ChineseQuotes';
import { Proofreading } from './extensions/Proofreading';
import { SearchHighlight } from './extensions/SearchHighlight';

export const FONT_FAMILIES = [
  { label: '系统默认', value: '' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '宋体', value: 'SimSun, "Songti SC", serif' },
  { label: '楷体', value: 'KaiTi, STKaiti, serif' },
  { label: '等线', value: 'DengXian, "Microsoft YaHei", sans-serif' },
  { label: '黑体', value: 'SimHei, "Microsoft YaHei", sans-serif' },
  { label: '英文衬线', value: 'Georgia, "Times New Roman", serif' },
] as const;

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;

export const LINE_HEIGHTS = [
  { label: '默认', value: '' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '1.9', value: '1.9' },
  { label: '2.1', value: '2.1' },
  { label: '2.4', value: '2.4' },
] as const;

export const TEXT_COLORS = [
  '#2b2f28',
  '#5d6659',
  '#9a4f43',
  '#b07a2e',
  '#4f6f52',
  '#3d6b86',
  '#6b5b8e',
  '#8a8f84',
] as const;

export function createEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      horizontalRule: false,
      link: { openOnClick: false, autolink: true, linkOnPaste: true },
    }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({
      allowBase64: true,
      HTMLAttributes: { class: 'editor-image' },
    }),
    TableKit.configure({
      table: { resizable: true, HTMLAttributes: { class: 'editor-table' } },
    }),
    Placeholder.configure({
      placeholder: '从这里开始，写下第一句话……',
    }),
    BlockStyle,
    ChineseQuotes,
    SearchHighlight,
    Proofreading,
  ];
}
