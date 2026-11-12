import type { Chapter } from '../types';
import { Icon } from './Icon';

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeId: string;
  open: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export function ChapterSidebar({
  chapters,
  activeId,
  open,
  onSelect,
  onAdd,
  onClose,
}: ChapterSidebarProps) {
  return (
    <aside
      className={`chapter-sidebar panel${open ? '' : ' is-collapsed'}`}
      aria-label="章节目录"
      aria-hidden={!open}
      data-testid="chapter-sidebar"
      data-open={open}
    >
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">WORKSPACE</p>
          <h2 className="panel-title">章节目录</h2>
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
            return (
              <li key={chapter.id}>
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
        <span>本地草稿 · 自动保存</span>
      </div>
    </aside>
  );
}
