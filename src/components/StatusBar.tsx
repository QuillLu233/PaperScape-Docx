import { Icon } from './Icon';

interface StatusBarProps {
  chapterIndex: number;
  chapterCount: number;
  characterCount: number;
  fullCharacterCount: number;
  savedAt: number;
  saving: boolean;
  dirty: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusBar({
  chapterIndex,
  chapterCount,
  characterCount,
  fullCharacterCount,
  savedAt,
  saving,
  dirty,
  focusMode,
  onToggleFocus,
}: StatusBarProps) {
  const saveLabel = saving
    ? '正在保存到项目…'
    : dirty
      ? '等待自动保存'
      : `已保存到项目 · ${formatTime(savedAt)}`;

  return (
    <footer className="statusbar" aria-label="状态栏">
      <div className="status-group">
        <span>
          第 {chapterIndex + 1} 章 / 共 {chapterCount} 章
        </span>
        <span className="status-separator" aria-hidden="true">
          ·
        </span>
        <span>本章 {formatCount(characterCount)} 字</span>
        <span className="status-separator" aria-hidden="true">
          ·
        </span>
        <span>全文 {formatCount(fullCharacterCount)} 字</span>
      </div>

      <div className={`status-saved${dirty ? ' is-dirty' : ''}`} aria-live="polite">
        {dirty ? null : <Icon name="check" size={12} />}
        <span>{saveLabel}</span>
      </div>

      <div className="status-group status-shortcuts" aria-label="快捷键提示">
        <button type="button" className="status-focus-button" onClick={onToggleFocus}>
          <Icon name="focus" size={12} />
          {focusMode ? '退出专注 (Esc)' : '专注写作'}
        </button>
        {focusMode ? null : (
          <>
            <span>
              <kbd>Ctrl</kbd>
              <kbd>S</kbd> 保存
            </span>
            <span>
              <kbd>Ctrl</kbd>
              <kbd>N</kbd> 新章
            </span>
            <span>
              <kbd>Ctrl</kbd>
              <kbd>Shift</kbd>
              <kbd>F</kbd> 专注
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
