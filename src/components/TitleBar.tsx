import type { MouseEvent, ReactNode } from 'react';
import { BrandMark, Icon } from './Icon';

interface TitleBarProps {
  leftOpen: boolean;
  rightOpen: boolean;
  isMaximized: boolean;
  focusMode: boolean;
  menu: ReactNode;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleFocus: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function TitleBar({
  leftOpen,
  rightOpen,
  isMaximized,
  focusMode,
  menu,
  onToggleLeft,
  onToggleRight,
  onToggleFocus,
  onMinimize,
  onToggleMaximize,
  onClose,
}: TitleBarProps) {
  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, a, [role="menu"]')) return;
    onToggleMaximize();
  };

  return (
    <header className="titlebar" data-tauri-drag-region onDoubleClick={handleDoubleClick}>
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="brand-badge">
          <BrandMark size={19} />
        </span>
        <span className="brand-name">PaperScape</span>
        <span className="brand-sub">纸境</span>
      </div>

      <div className="titlebar-menu" data-no-drag>
        {menu}
      </div>

      <div className="titlebar-drag" data-tauri-drag-region aria-hidden="true" />

      <div className="titlebar-tools" data-no-drag>
        <button
          type="button"
          className={`tool-button${focusMode ? ' is-active' : ''}`}
          aria-label={focusMode ? '退出专注写作' : '进入专注写作'}
          aria-pressed={focusMode}
          title={focusMode ? '退出专注写作 (Esc)' : '进入专注写作 (Ctrl+Shift+F)'}
          onClick={onToggleFocus}
        >
          <Icon name="focus" size={16} />
        </button>
        <button
          type="button"
          className={`tool-button${leftOpen ? ' is-active' : ''}`}
          aria-label={leftOpen ? '隐藏章节目录' : '显示章节目录'}
          aria-pressed={leftOpen}
          title={leftOpen ? '隐藏章节目录 (Ctrl+B)' : '显示章节目录 (Ctrl+B)'}
          onClick={onToggleLeft}
        >
          <Icon name="panel-left" size={16} />
        </button>
        <button
          type="button"
          className={`tool-button${rightOpen ? ' is-active' : ''}`}
          aria-label={rightOpen ? '隐藏设置面板' : '显示设置面板'}
          aria-pressed={rightOpen}
          title={rightOpen ? '隐藏设置面板 (Ctrl+Shift+B)' : '显示设置面板 (Ctrl+Shift+B)'}
          onClick={onToggleRight}
        >
          <Icon name="panel-right" size={16} />
        </button>
      </div>

      <div className="window-controls" data-no-drag>
        <button
          type="button"
          className="window-control"
          aria-label="最小化窗口"
          title="最小化"
          onClick={onMinimize}
        >
          <Icon name="minimize" size={10} strokeWidth={1.4} />
        </button>
        <button
          type="button"
          className="window-control"
          aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
          title={isMaximized ? '还原' : '最大化'}
          onClick={onToggleMaximize}
        >
          <Icon name={isMaximized ? 'restore' : 'maximize'} size={10} strokeWidth={1.4} />
        </button>
        <button
          type="button"
          className="window-control window-control-close"
          aria-label="关闭窗口"
          title="关闭"
          onClick={onClose}
        >
          <Icon name="close" size={10} strokeWidth={1.4} />
        </button>
      </div>
    </header>
  );
}
