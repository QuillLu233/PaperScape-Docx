import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { ProjectAppearance, WritingSettings } from '../types';
import type { ChapterFile } from '../project/types';
import { createEditorExtensions } from '../editor/editorConfig';
import { getPageDimensions, getPaperMargins, colorWithAlpha, paperTextColors } from '../appearance/presets';
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
  chapter: ChapterFile;
  index: number;
  total: number;
  settings: WritingSettings;
  appearance: ProjectAppearance;
  focusMode: boolean;
  readOnly?: boolean;
  standalone?: boolean;
  docZoom?: number;
  header?: ReactNode;
  onDocZoomChange?: (value: number) => void;
  onUpdate: (
    patch: Partial<Pick<ChapterFile, 'title' | 'doc' | 'characterCount' | 'excerpt'>>,
  ) => void;
}

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(
  {
    chapter,
    index,
    total,
    settings,
    appearance,
    focusMode,
    readOnly = false,
    standalone = false,
    docZoom = 100,
    header,
    onDocZoomChange,
    onUpdate,
  },
  ref,
) {
  const [searchOpen, setSearchOpen] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const initializedRef = useRef(false);
  const paneRef = useRef<HTMLElement>(null);

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: chapter.doc,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onCreate: () => {
      initializedRef.current = true;
    },
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
      if (!initializedRef.current) return;
      const text = current.getText();
      onUpdateRef.current({
        doc: current.getJSON(),
        characterCount: countCharacters(text),
        excerpt: excerpt(text),
      });
    },
  });

  const focus = useCallback(() => editor?.commands.focus(), [editor]);
  const blur = useCallback(() => editor?.commands.blur(), [editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    const node = paneRef.current;
    if (!node || !onDocZoomChange) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 10 : -10;
      onDocZoomChange(docZoom + direction);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [docZoom, onDocZoomChange]);

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

  const paperDimensions = getPageDimensions(appearance.paper);
  const margins = getPaperMargins(appearance.paper);
  const paperInk = paperTextColors(appearance.paper.color);
  const isPaper = appearance.mode === 'paper';
  const sheetStyle: CSSProperties & Record<`--${string}`, string | number> = isPaper
    ? {
        width: `${paperDimensions.width}px`,
        maxWidth: '100%',
        minHeight: `${paperDimensions.height}px`,
        padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
        backgroundColor: colorWithAlpha(appearance.paper.color, appearance.paper.opacity),
        boxShadow:
          appearance.paper.shadow > 0
            ? `0 20px 70px rgba(20, 24, 19, ${(appearance.paper.shadow / 100) * 0.36})`
            : 'none',
        '--paper-ink': paperInk.ink,
        '--paper-muted': paperInk.muted,
        '--paper-line': paperInk.line,
        '--reading-opacity': appearance.readingOpacity,
      }
    : {
        maxWidth: `${settings.editorWidth}px`,
        minHeight: 'calc(100% - 48px)',
        '--reading-opacity': appearance.readingOpacity,
      };

  return (
    <main
      ref={paneRef}
      className={`editor-pane mode-${appearance.mode}${focusMode ? ' is-focus-writing' : ''}`}
      aria-label="编辑区"
      data-writing-mode={appearance.mode}
    >
      <div className="editor-top">
        {!readOnly ? <EditorToolbar editor={editor} onFind={() => setSearchOpen(true)} /> : null}
        {searchOpen && editor ? (
          <FindReplaceBar editor={editor} onClose={() => setSearchOpen(false)} />
        ) : null}
      </div>

      {header}

      <div className="editor-scroll">
        <article
          className={`editor-sheet is-${appearance.mode}`}
          style={{ ...sheetStyle, zoom: docZoom / 100 }}
        >
          {!standalone ? (
            <>
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
            </>
          ) : null}

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
