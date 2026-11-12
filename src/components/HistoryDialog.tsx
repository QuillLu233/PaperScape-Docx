import type { HistoryEntry } from '../project/types';
import { Icon } from './Icon';

interface HistoryDialogProps {
  chapterTitle: string;
  entries: HistoryEntry[];
  loading: boolean;
  onRestore: (file: string) => void;
  onClose: () => void;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '时间未知';
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function HistoryDialog({
  chapterTitle,
  entries,
  loading,
  onRestore,
  onClose,
}: HistoryDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card history-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">HISTORY</p>
            <h2 id="history-title">历史版本</h2>
            <p className="history-subtitle">{chapterTitle}</p>
          </div>
          <button type="button" className="icon-button" aria-label="关闭历史版本" onClick={onClose}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <p className="modal-footnote">
          恢复前会先把当前版本再写入历史，因此不会覆盖掉现在的内容。项目自动保存时会滚动保留最近 40 个版本。
        </p>

        {loading ? (
          <p className="history-empty">正在读取历史…</p>
        ) : entries.length === 0 ? (
          <p className="history-empty">这个章节还没有历史版本。下一次保存后会自动创建。</p>
        ) : (
          <div className="history-list">
            {entries.map((entry) => (
              <div className="history-entry" key={entry.file}>
                <div className="history-entry-copy">
                  <strong>{formatTimestamp(entry.timestamp)}</strong>
                  <span>
                    {entry.characterCount} 字 · {entry.reason}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-button history-restore"
                  onClick={() => onRestore(entry.file)}
                >
                  恢复此版本
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </section>
    </div>
  );
}
