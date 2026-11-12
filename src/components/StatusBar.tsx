import { formatCount } from '../lib/text';
import { Icon } from './Icon';

interface StatusBarProps {
  chapterIndex: number;
  chapterCount: number;
  characterCount: number;
  fullCharacterCount: number;
  savedAt: number;
}

export function StatusBar({
  chapterIndex,
  chapterCount,
  characterCount,
  fullCharacterCount,
  savedAt,
}: StatusBarProps) {
  const time = new Date(savedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className="statusbar">
      <div className="status-group">
        <span>
          第 {chapterIndex + 1} 章 / 共 {chapterCount} 章
        </span>
        <span className="status-divider" aria-hidden="true" />
        <span>本章 {formatCount(characterCount)} 字</span>
        <span className="status-divider" aria-hidden="true" />
        <span>全文 {formatCount(fullCharacterCount)} 字</span>
      </div>

      <div className="status-group status-saved" aria-live="polite">
        <Icon name="check" size={12} />
        <span>已保存到本地 · {time}</span>
      </div>

      <div className="status-group status-shortcuts" aria-label="快捷键提示">
        <span>
          <kbd>Ctrl</kbd>
          <kbd>F</kbd> 查找
        </span>
        <span>
          <kbd>Ctrl</kbd>
          <kbd>B</kbd> 加粗
        </span>
        <span>
          <kbd>Ctrl</kbd>
          <kbd>Shift</kbd>
          <kbd>B</kbd> 设置
        </span>
      </div>
    </footer>
  );
}
