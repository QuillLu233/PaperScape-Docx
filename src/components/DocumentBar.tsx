import type { OpenDocxState } from '../workspace/types';
import { Icon } from './Icon';

interface DocumentBarProps {
  document: OpenDocxState | null;
  folder: string | null;
  saving: boolean;
  error: string;
  recovery: { savedAt: number; title: string } | null;
  recoveryError: string;
  onSave: () => void;
  onSaveAs: () => void;
  onReveal: () => void;
  onAuthorizeOverwrite: () => void;
  onToggleReadOnly: () => void;
  onRestoreRecovery: () => void;
  onDiscardRecovery: () => void;
  onClearError: () => void;
  onCloseDocument: () => void;
  onCloseWorkspace: () => void;
}

export function DocumentBar({
  document,
  folder,
  saving,
  error,
  recovery,
  recoveryError,
  onSave,
  onSaveAs,
  onReveal,
  onAuthorizeOverwrite,
  onToggleReadOnly,
  onRestoreRecovery,
  onDiscardRecovery,
  onClearError,
  onCloseDocument,
  onCloseWorkspace,
}: DocumentBarProps) {
  if (!document) {
    return (
      <div className="document-bar is-empty">
        <div className="document-bar-copy">
          <Icon name="folder" size={16} />
          <div>
            <strong>{folder ? '已打开文件夹' : '未打开文档'}</strong>
            <small>{folder || '从左侧文件树选择 DOCX，或新建文档'}</small>
          </div>
        </div>
        {folder ? (
          <button type="button" className="secondary-button" onClick={onCloseWorkspace}>
            关闭文件夹
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="document-bar">
      <div className="document-bar-main">
        <div className="document-bar-copy">
          <Icon name="file" size={16} />
          <div>
            <strong title={document.path || document.name}>
              {document.name}
              {document.dirty ? <span className="document-dirty">未保存</span> : null}
              {document.readOnly ? <span className="document-readonly">只读</span> : null}
            </strong>
            <small title={document.path || undefined}>
              {document.path || '尚未保存 · 首次保存将询问文件名和位置'}
            </small>
          </div>
        </div>
        <div className="document-actions">
          {document.path ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onReveal}
              title="在资源管理器中显示"
            >
              <Icon name="external" size={13} />
              资源管理器
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={onSaveAs} disabled={saving}>
            另存为
          </button>
          <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
            <Icon name="save" size={13} />
            {saving ? '保存中…' : '保存'}
          </button>
          <button type="button" className="icon-button" aria-label="关闭文稿" title="关闭文稿" onClick={onCloseDocument}>
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>

      {document.risk.warnings.length > 0 ? (
        <div className="document-risk" role="alert">
          <div>
            <strong>这个 DOCX 含有当前转换流程不支持的内容</strong>
            <ul>
              {document.risk.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <p>
              默认不会覆盖原文件。请“另存为”副本；如果你确认接受格式损失，可以明确授权覆盖，
              保存前仍会建立原件备份。
            </p>
          </div>
          <div className="document-risk-actions">
            <button type="button" className="secondary-button" onClick={onToggleReadOnly}>
              {document.readOnly ? '退出只读' : '只读查看'}
            </button>
            <button type="button" className="secondary-button" onClick={onSaveAs} disabled={saving}>
              保存副本
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={onAuthorizeOverwrite}
              disabled={document.overwriteAuthorized}
            >
              {document.overwriteAuthorized ? '已授权覆盖' : '明确授权覆盖原文件'}
            </button>
          </div>
        </div>
      ) : (
        <div className="document-safe">
          <Icon name="check" size={12} />
          可直接保存回原 DOCX；每次覆盖前会自动备份原件。
        </div>
      )}

      {document.backupPath ? (
        <div className="document-backup" title={document.backupPath}>
          <Icon name="history" size={12} />
          原件备份：{document.backupPath}
        </div>
      ) : null}

      {recovery ? (
        <div className="document-risk" role="status">
          <div>
            <strong>发现未保存的恢复草稿</strong>
            <p>
              《{recovery.title}》有一份 {new Date(recovery.savedAt).toLocaleString('zh-CN')} 的自动恢复内容。
            </p>
          </div>
          <div className="document-risk-actions">
            <button type="button" className="secondary-button" onClick={onDiscardRecovery}>
              丢弃草稿
            </button>
            <button type="button" className="primary-button" onClick={onRestoreRecovery}>
              恢复草稿
            </button>
          </div>
        </div>
      ) : null}

      {recoveryError ? <div className="document-error">自动恢复草稿保存失败：{recoveryError}</div> : null}
      {error ? (
        <div className="document-error" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="关闭错误提示" onClick={onClearError}>
            <Icon name="close" size={11} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
