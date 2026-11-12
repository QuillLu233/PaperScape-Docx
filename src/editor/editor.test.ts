import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createEditorExtensions } from './editorConfig';
import {
  getSearchState,
  replaceAllSearchMatches,
  replaceCurrentSearchMatch,
  setSearchState,
} from './extensions/SearchHighlight';
import { countCharacters } from '../lib/text';

const editors: Editor[] = [];

function createEditor(content = '<p></p>'): Editor {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: createEditorExtensions(),
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = '';
});

describe('Tiptap editor capabilities', () => {
  it('accepts mixed Chinese, English and numeric input', () => {
    const editor = createEditor();
    editor.commands.setContent('<p>中文输入 English mixed 123，标点正常。</p>');

    expect(editor.getText()).toBe('中文输入 English mixed 123，标点正常。');
    expect(countCharacters(editor.getText())).toBe(25);
  });

  it('supports H1/H2/H3 and paragraph blocks', () => {
    const editor = createEditor('<p>正文</p>');

    editor.commands.setHeading({ level: 1 });
    expect(editor.getHTML()).toContain('<h1>正文</h1>');
    editor.commands.setHeading({ level: 2 });
    expect(editor.getHTML()).toContain('<h2>正文</h2>');
    editor.commands.setHeading({ level: 3 });
    expect(editor.getHTML()).toContain('<h3>正文</h3>');
    editor.commands.setParagraph();
    expect(editor.getHTML()).toContain('<p>正文</p>');
  });

  it('applies bold, italic, underline and strike marks', () => {
    const editor = createEditor('<p>格式测试</p>');
    editor.commands.selectAll();
    editor.commands.toggleBold();
    editor.commands.toggleItalic();
    editor.commands.toggleUnderline();
    editor.commands.toggleStrike();

    const html = editor.getHTML();
    expect(html).toContain('<strong>');
    expect(html).toContain('<em>');
    expect(html).toContain('<u>');
    expect(html).toContain('<s>');
  });

  it('applies font family, font size and text color', () => {
    const editor = createEditor('<p>样式测试</p>');
    editor.commands.selectAll();
    editor.commands.setFontFamily('SimSun, serif');
    editor.commands.setFontSize('24px');
    editor.commands.setColor('#9a4f43');

    const html = editor.getHTML();
    expect(html).toContain('font-family: SimSun, serif');
    expect(html).toContain('font-size: 24px');
    expect(html).toMatch(/color: (rgb\(154, 79, 67\)|#9a4f43)/);
  });

  it('applies alignment, line height and first-line indent', () => {
    const editor = createEditor('<p>段落排版</p>');
    editor.commands.setTextAlign('center');
    editor.chain().updateAttributes('paragraph', { lineHeight: '2.1', textIndent: '2em' }).run();

    const html = editor.getHTML();
    expect(html).toContain('text-align: center');
    expect(html).toContain('line-height: 2.1');
    expect(html).toContain('text-indent: 2em');
  });

  it('creates ordered and unordered lists', () => {
    const editor = createEditor('<p>第一项</p>');
    editor.commands.toggleBulletList();
    expect(editor.getHTML()).toContain('<ul>');
    editor.commands.toggleBulletList();
    editor.commands.toggleOrderedList();
    expect(editor.getHTML()).toContain('<ol>');
  });

  it('undoes and redoes edits', () => {
    const editor = createEditor('<p>初始</p>');
    editor.commands.insertContent('，新增内容');
    expect(editor.getText()).toContain('新增内容');

    editor.commands.undo();
    expect(editor.getText()).toBe('初始');
    editor.commands.redo();
    expect(editor.getText()).toContain('新增内容');
  });

  it('finds and replaces text across the document', () => {
    const editor = createEditor('<p>春天来了，春风吹过。Spring is here.</p><p>春天很好。</p>');
    setSearchState(editor, '春', 0);
    let state = getSearchState(editor);
    expect(state?.matches).toHaveLength(3);

    expect(replaceCurrentSearchMatch(editor, '夏')).toBe(true);
    expect(editor.getText()).toContain('夏天来了');
    setSearchState(editor, '春', 0);
    expect(replaceAllSearchMatches(editor, '秋')).toBe(2);
    expect(editor.getText()).not.toContain('春');
    expect(editor.getText()).toContain('秋风');
  });

  it('searches English case-insensitively', () => {
    const editor = createEditor('<p>PaperScape paper scape.</p>');
    setSearchState(editor, 'PAPER', 0);

    expect(getSearchState(editor)?.matches).toHaveLength(2);
  });

  it('finds phrases that span inline formatting boundaries', () => {
    const editor = createEditor('<p>hello <strong>world</strong> and beyond</p>');
    setSearchState(editor, 'hello world', 0);

    expect(getSearchState(editor)?.matches).toHaveLength(1);
    expect(replaceCurrentSearchMatch(editor, '你好世界')).toBe(true);
    expect(editor.getText()).toContain('你好世界');
  });

  it('inserts, extends and removes a table', () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    expect(editor.getHTML()).toContain('<table');
    expect(editor.getHTML()).toContain('<th');

    editor.commands.addRowAfter();
    editor.commands.addColumnAfter();
    expect(editor.getHTML()).toContain('<tr>');
    editor.commands.deleteTable();
    expect(editor.getHTML()).not.toContain('<table');
  });

  it('inserts base64 images', () => {
    const editor = createEditor();
    editor.commands.setImage({
      src: 'data:image/png;base64,iVBORw0KGgo=',
      alt: '示例图片',
    });

    expect(editor.getHTML()).toContain('<img');
    expect(editor.getHTML()).toContain('alt="示例图片"');
  });

  it('handles a long mixed document without losing text', () => {
    const editor = createEditor();
    const paragraph = '<p>这是一段用于长文测试的中文与 English mixed 文本，标点符号应当保持完整。</p>';
    editor.commands.setContent(paragraph.repeat(2000));

    expect(editor.getText()).toContain('长文测试');
    expect(countCharacters(editor.getText())).toBeGreaterThan(50000);
    const html = editor.getHTML();
    expect(html.length).toBeGreaterThan(50000);
  });
});
