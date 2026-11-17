import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createEditorExtensions } from './editorConfig';
import { moveEditorText } from './textDrag';

const editors: Editor[] = [];

function createEditor(content: string): Editor {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new Editor({ element, extensions: createEditorExtensions(), content });
  editors.push(editor);
  return editor;
}

function findText(editor: Editor, text: string, fromIndex = 0): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0 || !node.isText || !node.text) return;
    const index = node.text.indexOf(text, fromIndex);
    if (index >= 0) found = pos + index;
  });
  return found;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = '';
});

describe('editor text drag movement', () => {
  it('moves a formatted cross-paragraph selection as one undoable edit', () => {
    const editor = createEditor('<p><strong>Bold</strong> tail</p><p>target</p>');
    const from = 1;
    const to = 5;
    const dropAt = findText(editor, 'target') + 'target'.length;

    expect(moveEditorText(editor.view, from, to, dropAt, false)).toBe(true);
    expect(editor.getText()).toContain('targetBold');
    expect(editor.getHTML()).toContain('<strong>Bold</strong>');

    editor.commands.undo();
    expect(editor.getText()).toContain('Bold tail');
    expect(editor.getText()).toContain('target');
  });

  it('copies the selection when requested and leaves the source intact', () => {
    const editor = createEditor('<p><strong>Copy</strong> source</p><p>target</p>');
    const dropAt = findText(editor, 'target') + 'target'.length;

    expect(moveEditorText(editor.view, 1, 5, dropAt, true)).toBe(true);
    expect(editor.getHTML().match(/<strong>Copy<\/strong>/g)).toHaveLength(2);
    expect(editor.getText()).toContain('Copy source');
  });

  it('does not move a selection onto itself', () => {
    const editor = createEditor('<p>unchanged</p>');
    expect(moveEditorText(editor.view, 1, 4, 2, false)).toBe(false);
    expect(editor.getText()).toBe('unchanged');
  });
});
