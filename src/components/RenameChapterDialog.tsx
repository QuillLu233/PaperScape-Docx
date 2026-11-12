import { useEffect, useRef, useState, type FormEvent } from 'react';

interface RenameChapterDialogProps {
  title: string;
  onSave: (title: string) => void;
  onClose: () => void;
}

export function RenameChapterDialog({ title, onSave, onClose }: RenameChapterDialogProps) {
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (next) onSave(next);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="modal-card rename-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <p className="panel-kicker">CHAPTER</p>
          <h2 id="rename-title">重命名章节</h2>
        </div>
        <input
          ref={inputRef}
          className="rename-input"
          aria-label="章节名称"
          value={draft}
          maxLength={80}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
        />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button" disabled={!draft.trim()}>
            保存名称
          </button>
        </div>
      </form>
    </div>
  );
}
