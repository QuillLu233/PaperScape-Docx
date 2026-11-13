import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChapterSummary } from '../project/types';
import { Icon } from './Icon';

interface ChapterSidebarProps {
  chapters: ChapterSummary[];
  activeId: string;
  open: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDelete: (chapter: ChapterSummary) => void;
  onHistory: (chapter: ChapterSummary) => void;
  onClose: () => void;
}

export function ChapterSidebar({
  chapters,
  activeId,
  open,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDelete,
  onHistory,
  onClose,
}: ChapterSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const cancelEditRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  const startRename = (chapter: ChapterSummary) => {
    cancelEditRef.current = false;
    setDraft(chapter.title || '未命名章节');
    setEditingId(chapter.id);
  };

  const finishRename = (chapter: ChapterSummary) => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setEditingId(null);
      return;
    }
    const next = draft.trim();
    setEditingId(null);
    if (next && next !== chapter.title) onRename(chapter.id, next);
  };

  const submitRename = (event: FormEvent, chapter: ChapterSummary) => {
    event.preventDefault();
    finishRename(chapter);
  };

  return (
    <aside
      className={`chapter-sidebar panel${open ? '' : ' is-collapsed'}`}
      aria-label="章节目录"
      aria-hidden={!open}
      data-testid="chapter-sidebar"
      data-open={open}
    >
      <div className="panel-heading">
        <div className="project-heading-copy">
          <p className="panel-kicker">PROJECT</p>
          <h2 className="panel-title">章节目录</h2>
          <p className="panel-subtitle">共 {chapters.length} 章</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="收起章节目录"
          title="收起章节目录 (Ctrl+B)"
          onClick={onClose}
        >
          <Icon name="panel-left" size={16} />
        </button>
      </div>

      <nav className="chapter-list" aria-label="章节列表">
        <ol>
          {chapters.map((chapter, index) => {
            const active = chapter.id === activeId;
            const editing = chapter.id === editingId;
            return (
              <li key={chapter.id} className="chapter-row">
                {editing ? (
                  <form
                    className="chapter-rename-form"
                    onSubmit={(event) => submitRename(event, chapter)}
                  >
                    <input
                      ref={inputRef}
                      className="chapter-rename-input"
                      aria-label={`重命名章节 ${chapter.title}`}
                      value={draft}
                      maxLength={80}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelEditRef.current = true;
                          setEditingId(null);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="chapter-inline-action"
                      aria-label="确认重命名"
                      title="确认重命名"
                    >
                      <Icon name="check" size={12} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className={`chapter-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSelect(chapter.id)}
                  >
                    <span className="chapter-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="chapter-copy">
                      <span className="chapter-name">{chapter.title || '未命名章节'}</span>
                      <span className="chapter-excerpt">{chapter.excerpt || '空白章节'}</span>
                    </span>
                    <span className="chapter-count">{chapter.characterCount}</span>
                  </button>
                )}

                <div className="chapter-actions" aria-label={`章节操作 ${chapter.title}`}>
                  <button
                    type="button"
                    className="chapter-action"
                    aria-label={`重命名 ${chapter.title}`}
                    title="重命名"
                    onClick={() => startRename(chapter)}
                  >
                    <Icon name="edit" size={11} />
                  </button>
                  <button
                    type="button"
                    className="chapter-action"
                    aria-label={`上移 ${chapter.title}`}
                    title="上移"
                    disabled={index === 0}
                    onClick={() => onMove(chapter.id, 'up')}
                  >
                    <Icon name="chevron-up" size={11} />
                  </button>
                  <button
                    type="button"
                    className="chapter-action"
                    aria-label={`下移 ${chapter.title}`}
                    title="下移"
                    disabled={index === chapters.length - 1}
                    onClick={() => onMove(chapter.id, 'down')}
                  >
                    <Icon name="chevron-down" size={11} />
                  </button>
                  <button
                    type="button"
                    className="chapter-action"
                    aria-label={`历史版本 ${chapter.title}`}
                    title="历史版本"
                    onClick={() => onHistory(chapter)}
                  >
                    <Icon name="history" size={11} />
                  </button>
                  <button
                    type="button"
                    className="chapter-action is-danger"
                    aria-label={`删除 ${chapter.title}`}
                    title="移入项目回收目录"
                    onClick={() => onDelete(chapter)}
                  >
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <button type="button" className="new-chapter-button" onClick={onAdd}>
        <Icon name="plus" size={15} />
        <span>新建章节</span>
      </button>

      <div className="sidebar-footer">
        <span className="status-dot" aria-hidden="true" />
        <span>本地项目 · 自动保存</span>
      </div>
    </aside>
  );
}
