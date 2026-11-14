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
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { ProjectAppearance, WritingSettings } from '../types';
import type { ChapterFile } from '../project/types';
import { createEditorExtensions } from '../editor/editorConfig';
import { proofreadingPluginKey } from '../editor/extensions/Proofreading';
import { collectProofreadingIssues, type ProofreadingIssue } from '../proofreading/rules';
import { getPageDimensions, getPaperMargins, colorWithAlpha, paperTextColors } from '../appearance/presets';
import { countCharacters, excerpt, formatCount } from '../lib/text';
import { EditorToolbar } from './EditorToolbar';
import { FindReplaceBar } from './FindReplaceBar';
import { ProofreadingPopover } from './ProofreadingPopover';

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
  proofreadingEnabled?: boolean;
  proofreadingDictionary?: string[];
  proofreadingIgnored?: string[];
  onAddProofreadingWord?: (word: string) => void;
  onIgnoreProofreading?: (fingerprint: string) => void;
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
    proofreadingEnabled = false,
    proofreadingDictionary = [],
    proofreadingIgnored = [],
    onAddProofreadingWord,
    onIgnoreProofreading,
    onDocZoomChange,
    onUpdate,
  },
  ref,
) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [proofreadingPopup, setProofreadingPopup] = useState<{
    issue: ProofreadingIssue;
    rect: { left: number; top: number; right: number; bottom: number };
  } | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const initializedRef = useRef(false);
  const paneRef = useRef<HTMLElement>(null);
  const proofreadingIssuesRef = useRef(new Map<string, ProofreadingIssue>());
  const proofreadingTimerRef = useRef<number | undefined>(undefined);
  const proofreadingHoverRef = useRef<number | undefined>(undefined);
  const composingRef = useRef(false);
  const scheduleProofreadingRef = useRef<(delay?: number) => void>(() => undefined);

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: chapter.doc,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onCreate: () => {
      initializedRef.current = true;
      scheduleProofreadingRef.current(120);
    },
    onSelectionUpdate: () => {
      scheduleProofreadingRef.current(300);
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
      scheduleProofreadingRef.current(650);
    },
  });

  const clearProofreadingDecorations = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    proofreadingIssuesRef.current.clear();
    editor.view.dispatch(
      editor.state.tr.setMeta(proofreadingPluginKey, DecorationSet.empty),
    );
    setProofreadingPopup(null);
  }, [editor]);

  const runProofreading = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    if (!proofreadingEnabled || composingRef.current || editor.view.composing) {
      clearProofreadingDecorations();
      return;
    }
    const { $from } = editor.state.selection;
    const parent = $from.parent;
    if (parent.type.name !== 'paragraph' && parent.type.name !== 'heading') {
      clearProofreadingDecorations();
      return;
    }
    let hasInlineNode = false;
    parent.forEach((node) => {
      if (!node.isText) hasInlineNode = true;
    });
    if (hasInlineNode || parent.content.size > 12_000) {
      clearProofreadingDecorations();
      return;
    }
    const text = parent.textContent;
    const issues = collectProofreadingIssues(text, {
      dictionary: proofreadingDictionary,
      ignored: proofreadingIgnored,
      maxIssues: 24,
    });
    const textStart = $from.start();
    const decorations = issues.map((issue) =>
      Decoration.inline(textStart + issue.from, textStart + issue.to, {
        class: 'proofreading-issue',
        'data-proofreading-id': issue.id,
        title: issue.message,
      }),
    );
    proofreadingIssuesRef.current = new Map(issues.map((issue) => [issue.id, issue]));
    try {
      editor.view.dispatch(
        editor.state.tr.setMeta(
          proofreadingPluginKey,
          DecorationSet.create(editor.state.doc, decorations),
        ),
      );
    } catch {
      return;
    }
    setProofreadingPopup((current) => {
      if (!current) return current;
      return proofreadingIssuesRef.current.has(current.issue.id) ? current : null;
    });
  }, [
    clearProofreadingDecorations,
    editor,
    proofreadingDictionary,
    proofreadingEnabled,
    proofreadingIgnored,
  ]);

  const scheduleProofreading = useCallback(
    (delay = 650) => {
      window.clearTimeout(proofreadingTimerRef.current);
      if (!proofreadingEnabled) {
        clearProofreadingDecorations();
        return;
      }
      proofreadingTimerRef.current = window.setTimeout(runProofreading, delay);
    },
    [clearProofreadingDecorations, proofreadingEnabled, runProofreading],
  );
  scheduleProofreadingRef.current = scheduleProofreading;

  useEffect(() => {
    scheduleProofreading(220);
    return () => window.clearTimeout(proofreadingTimerRef.current);
  }, [scheduleProofreading]);

  useEffect(() => {
    if (!proofreadingEnabled) clearProofreadingDecorations();
  }, [clearProofreadingDecorations, proofreadingEnabled]);

  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    const onCompositionStart = () => {
      composingRef.current = true;
      window.clearTimeout(proofreadingTimerRef.current);
    };
    const onCompositionEnd = () => {
      composingRef.current = false;
      scheduleProofreading(280);
    };
    dom.addEventListener('compositionstart', onCompositionStart);
    dom.addEventListener('compositionend', onCompositionEnd);
    return () => {
      dom.removeEventListener('compositionstart', onCompositionStart);
      dom.removeEventListener('compositionend', onCompositionEnd);
    };
  }, [editor, scheduleProofreading]);

  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    const show = (element: HTMLElement) => {
      const id = element.dataset.proofreadingId;
      if (!id) return;
      const issue = proofreadingIssuesRef.current.get(id);
      if (!issue) return;
      const rect = element.getBoundingClientRect();
      setProofreadingPopup({
        issue,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      });
    };
    const findIssue = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null;
      return target.closest<HTMLElement>('[data-proofreading-id]');
    };
    const onMouseOver = (event: MouseEvent) => {
      const element = findIssue(event.target);
      if (!element) return;
      window.clearTimeout(proofreadingHoverRef.current);
      proofreadingHoverRef.current = window.setTimeout(() => show(element), 220);
    };
    const onClick = (event: MouseEvent) => {
      const element = findIssue(event.target);
      if (!element) return;
      window.clearTimeout(proofreadingHoverRef.current);
      show(element);
    };
    dom.addEventListener('mouseover', onMouseOver);
    dom.addEventListener('click', onClick);
    return () => {
      window.clearTimeout(proofreadingHoverRef.current);
      dom.removeEventListener('mouseover', onMouseOver);
      dom.removeEventListener('click', onClick);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !proofreadingPopup) return;
    const dom = editor.view.dom;
    const scrollHost = dom.closest<HTMLElement>('.editor-scroll') ?? dom;
    const onScroll = () => setProofreadingPopup(null);
    scrollHost.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollHost.removeEventListener('scroll', onScroll);
  }, [editor, proofreadingPopup]);

  useEffect(() => {
    if (!proofreadingPopup) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.proofreading-popover') || target.closest('.proofreading-issue')) {
        return;
      }
      setProofreadingPopup(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [proofreadingPopup]);

  const focus = useCallback(() => editor?.commands.focus(), [editor]);
  const blur = useCallback(() => editor?.commands.blur(), [editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    const node = paneRef.current;
    if (!node || !onDocZoomChange) return;

    let ctrlHeld = false;
    let wheelAttached = false;

    const onWheel = (event: WheelEvent) => {
      if (!ctrlHeld || !event.ctrlKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 10 : -10;
      onDocZoomChange(docZoom + direction);
    };

    // A permanently attached non-passive wheel listener blocks the browser's
    // scrolling path on every wheel event. Only intercept wheel while Ctrl is
    // held, so ordinary scrolling stays passive and smooth.
    const attachWheel = () => {
      if (wheelAttached) return;
      node.addEventListener('wheel', onWheel, { passive: false });
      wheelAttached = true;
    };
    const detachWheel = () => {
      if (!wheelAttached) return;
      node.removeEventListener('wheel', onWheel);
      wheelAttached = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        ctrlHeld = true;
        attachWheel();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        ctrlHeld = false;
        detachWheel();
      }
    };
    const onWindowBlur = () => {
      ctrlHeld = false;
      detachWheel();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onWindowBlur);
      detachWheel();
    };
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

      {proofreadingPopup ? (
        <ProofreadingPopover
          issue={proofreadingPopup.issue}
          rect={proofreadingPopup.rect}
          onIgnore={() => {
            onIgnoreProofreading?.(proofreadingPopup.issue.fingerprint);
            setProofreadingPopup(null);
          }}
          onAddDictionary={() => {
            const word = proofreadingPopup.issue.word || proofreadingPopup.issue.text;
            onAddProofreadingWord?.(word);
            setProofreadingPopup(null);
          }}
          onClose={() => setProofreadingPopup(null)}
        />
      ) : null}
    </main>
  );
});
