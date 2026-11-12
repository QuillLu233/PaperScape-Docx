import { Icon } from './Icon';
import type { ImportedDocx } from '../docx/importDocx';

interface ImportDocxDialogProps {
  imported: ImportedDocx;
  busy: boolean;
  onImport: () => void;
  onClose: () => void;
}

export function ImportDocxDialog({
  imported,
  busy,
  onImport,
  onClose,
}: ImportDocxDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card docx-import-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docx-import-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">IMPORT DOCX</p>
            <h2 id="docx-import-title">导入 Word 文档</h2>
            <p className="history-subtitle">{imported.title}</p>
          </div>
          <button type="button" className="icon-button" aria-label="关闭导入对话框" onClick={onClose}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="docx-import-stats">
          <span>{imported.characterCount} 字</span>
          <span>{imported.imageCount} 张图片</span>
          <span>{imported.tableCount} 个表格</span>
        </div>

        <p className="modal-lead">
          会创建一个新章节，原 DOCX 文件不会被修改或覆盖。正文会被清洗后以 Tiptap JSON 保存。
        </p>

        {imported.warnings.length > 0 ? (
          <div className="docx-warning-box">
            <strong>兼容性提示</strong>
            <ul>
              {imported.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="docx-preview">
          <p className="panel-kicker">TEXT PREVIEW</p>
          <p>{imported.excerpt || '（没有可预览的文本）'}</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="primary-button" onClick={onImport} disabled={busy}>
            {busy ? '导入中…' : '作为新章节导入'}
          </button>
        </div>
      </section>
    </div>
  );
}
