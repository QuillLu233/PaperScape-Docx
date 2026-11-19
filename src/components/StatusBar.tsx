import type { ReactNode } from 'react';
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
  standalone?: boolean;
  documentName?: string;
  saveError?: string;
  zoom: number;
  onZoomChange: (value: number) => void;
  music?: ReactNode;
}

const ZOOM_OPTIONS = Array.from({ length: 16 }, (_, index) => 50 + index * 10);

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
  standalone = false,
  documentName = '',
  saveError = '',
  zoom,
  onZoomChange,
  music,
}: StatusBarProps) {
  const saveLabel = saveError
    ? '保存失败'
    : saving
      ? '正在保存…'
      : dirty
        ? '尚未保存'
        : savedAt > 0
          ? `已保存 · ${formatTime(savedAt)}`
          : '已保存';

  return (
    <footer className="statusbar" aria-label="状态栏">
      <div className="status-group">
        {standalone ? (
          <>
            <span className="status-document-name" title={documentName}>
              {documentName || '未命名文稿'}
            </span>
            <span className="status-separator" aria-hidden="true">
              ·
            </span>
            <span>{formatCount(characterCount)} 字</span>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div
        className={`status-saved${dirty || saveError ? ' is-dirty' : ''}`}
        aria-live="polite"
        title={saveError || (savedAt > 0 ? `最近保存 ${formatTime(savedAt)}` : undefined)}
      >
        {dirty || saveError ? null : <Icon name="check" size={12} />}
        <span>{saveLabel}</span>
      </div>

      {music}

      <div className="status-group status-shortcuts" aria-label="缩放和快捷键">
        <div className="status-zoom" aria-label="文稿缩放">
          <button
            type="button"
            aria-label="缩小文稿"
            title="缩小文稿 (Ctrl+-)"
            onClick={() => onZoomChange(zoom - 10)}
          >
            −
          </button>
          <select
            aria-label="文稿缩放"
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
          >
            {ZOOM_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="放大文稿"
            title="放大文稿 (Ctrl+=)"
            onClick={() => onZoomChange(zoom + 10)}
          >
            +
          </button>
        </div>
        {standalone ? null : (
          <>
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
          </>
        )}
      </div>
    </footer>
  );
}
