import type { RefObject } from 'react';
import type { Chapter, WritingSettings } from '../types';
import { countCharacters, formatCount } from '../lib/text';

interface EditorPaneProps {
  chapter: Chapter;
  index: number;
  total: number;
  settings: WritingSettings;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onUpdate: (patch: Partial<Pick<Chapter, 'title' | 'content'>>) => void;
}

export function EditorPane({
  chapter,
  index,
  total,
  settings,
  textareaRef,
  onUpdate,
}: EditorPaneProps) {
  const count = countCharacters(chapter.content);

  return (
    <main className="editor-pane" aria-label="编辑区">
      <div className="editor-scroll">
        <article className="editor-sheet">
          <div className="editor-meta">
            <span className="editor-chapter-label">
              第 {String(index + 1).padStart(2, '0')} 章
              <span className="editor-total"> / {String(total).padStart(2, '0')}</span>
            </span>
            <span className="editor-char-count">{formatCount(count)} 字</span>
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

          <textarea
            ref={textareaRef}
            className="editor-textarea"
            aria-label="正文编辑器"
            value={chapter.content}
            placeholder="从这里开始，写下第一句话……"
            spellCheck={false}
            style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
            onChange={(event) => onUpdate({ content: event.target.value })}
          />
        </article>
      </div>
    </main>
  );
}
