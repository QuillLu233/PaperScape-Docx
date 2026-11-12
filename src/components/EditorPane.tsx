import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Chapter, WritingSettings } from '../types';
import { createEditorExtensions } from '../editor/editorConfig';
import { countCharacters, excerpt, formatCount } from '../lib/text';
import { EditorToolbar } from './EditorToolbar';
import { FindReplaceBar } from './FindReplaceBar';

export interface EditorPaneHandle {
  focus: () => void;
  blur: () => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  openFind: () => void;
}

interface EditorPaneProps {
  chapter: Chapter;
  index: number;
  total: number;
  settings: WritingSettings;
  onUpdate: (
    patch: Partial<Pick<Chapter, 'title' | 'content' | 'characterCount' | 'excerpt'>>,
  ) => void;
}

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(
  { chapter, index, total, settings, onUpdate },
  ref,
) {
  const [searchOpen, setSearchOpen] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: chapter.content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'tiptap',
        role: 'textbox',
        'aria-label': '正文编辑器',
        'aria-multiline': 'true',
        spellcheck: 'false',
        autocapitalize: 'off',
        autocomplete: 'off',
      },
    },
    onUpdate: ({ editor: current }) => {
      const text = current.getText();
      onUpdateRef.current({
        content: current.getHTML(),
        characterCount: countCharacters(text),
        excerpt: excerpt(text),
      });
    },
  });

  const focus = useCallback(() => editor?.commands.focus('end'), [editor]);
  const blur = useCallback(() => editor?.commands.blur(), [editor]);

  useImperativeHandle(
    ref,
    () => ({
      focus,
      blur,
      undo: () => editor?.chain().focus().undo().run(),
      redo: () => editor?.chain().focus().redo().run(),
      selectAll: () => editor?.chain().focus().selectAll().run(),
      openFind: () => setSearchOpen(true),
    }),
    [blur, editor, focus],
  );

  return (
    <main className="editor-pane" aria-label="编辑区">
      <div className="editor-top">
        <EditorToolbar editor={editor} onFind={() => setSearchOpen(true)} />
        {searchOpen && editor ? (
          <FindReplaceBar editor={editor} onClose={() => setSearchOpen(false)} />
        ) : null}
      </div>

      <div className="editor-scroll">
        <article
          className="editor-sheet"
          style={{ maxWidth: settings.editorWidth }}
          data-editor-width={settings.editorWidth}
        >
          <div className="editor-meta">
            <span className="editor-chapter-label">
              第 {String(index + 1).padStart(2, '0')} 章
              <span className="editor-total"> / {String(total).padStart(2, '0')}</span>
            </span>
            <span className="editor-char-count">{formatCount(chapter.characterCount)} 字</span>
          </div>

          <input
            className="chapter-title-input"
            aria-label="章节标题"
            value={chapter.title}
            placeholder="未命名章节"
            maxLength={80}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />

          <div className="editor-rule" aria-hidden="true" />

          <div
            className="editor-content"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </article>
      </div>
    </main>
  );
});
