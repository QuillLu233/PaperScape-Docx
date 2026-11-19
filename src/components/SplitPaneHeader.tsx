import type { OpenDocxState } from '../workspace/types';
import { Icon } from './Icon';

interface SplitPaneHeaderProps {
  document: OpenDocxState | null;
  editable: boolean;
  saving: boolean;
  onToggleLock: () => void;
  onClose: () => void;
  onChoose: () => void;
}

export function SplitPaneHeader({
  document,
  editable,
  saving,
  onToggleLock,
  onClose,
  onChoose,
}: SplitPaneHeaderProps) {
  return (
    <div className="split-pane-header">
      <div className="split-pane-title">
        <Icon name="file" size={14} />
        <strong title={document?.path ?? undefined}>
          {document?.name ?? '右侧参考文稿'}
        </strong>
        {saving ? <span className="split-pane-muted">保存中…</span> : null}
        {!document ? (
          <button type="button" className="text-button" onClick={onChoose}>
            选择文稿
          </button>
        ) : (
          <span className={`split-pane-muted${editable ? ' is-editing' : ''}`}>
            {editable ? '双编辑' : '只读参考'}
          </span>
        )}
      </div>
      <div className="split-pane-actions">
        {document ? (
          <button
            type="button"
            className={`split-icon-button${editable ? ' is-active' : ''}`}
            aria-label={editable ? '锁定右侧文稿' : '解锁右侧编辑'}
            title={editable ? '锁定并保存右侧文稿' : '解锁右侧编辑'}
            onClick={onToggleLock}
          >
            <Icon name={editable ? 'check' : 'edit'} size={14} />
          </button>
        ) : null}
        <button
          type="button"
          className="split-icon-button"
          aria-label="关闭分屏"
          title="关闭分屏"
          onClick={onClose}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}
