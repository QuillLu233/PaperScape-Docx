import type { ProofreadingIssue } from '../proofreading/rules';
import { Icon } from './Icon';

interface ProofreadingPopoverProps {
  issue: ProofreadingIssue;
  rect: { left: number; top: number; right: number; bottom: number };
  onIgnore: () => void;
  onAddDictionary: () => void;
  onClose: () => void;
}

export function ProofreadingPopover({
  issue,
  rect,
  onIgnore,
  onAddDictionary,
  onClose,
}: ProofreadingPopoverProps) {
  const width = 300;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 8;
  const top =
    below + 180 > window.innerHeight
      ? Math.max(8, rect.top - 178)
      : below;

  return (
    <div
      className="proofreading-popover"
      role="dialog"
      aria-label="校对建议"
      style={{ left, top, width }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="proofreading-popover-head">
        <span className="proofreading-kicker">中文校对 · 本地规则</span>
        <button type="button" className="icon-button" aria-label="关闭校对建议" onClick={onClose}>
          <Icon name="close" size={12} />
        </button>
      </div>
      <p className="proofreading-message">{issue.message}</p>
      {issue.suggestion ? <p className="proofreading-suggestion">{issue.suggestion}</p> : null}
      <div className="proofreading-actions">
        <button type="button" className="secondary-button" onClick={onIgnore}>
          忽略此处
        </button>
        {issue.word ? (
          <button type="button" className="secondary-button" onClick={onAddDictionary}>
            加入个人词典
          </button>
        ) : null}
      </div>
      <p className="proofreading-footnote">仅提示，不会自动修改正文。复杂语义问题不在本阶段范围内。</p>
    </div>
  );
}
