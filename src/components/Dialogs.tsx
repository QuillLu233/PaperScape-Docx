import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BrandMark, Icon } from './Icon';

interface ModalProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ title, eyebrow, onClose, children }: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <div>
            {eyebrow ? <p className="panel-kicker">{eyebrow}</p> : null}
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="关闭对话框"
            onClick={onClose}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  ['新建章节', ['Ctrl', 'N']],
  ['保存到本地', ['Ctrl', 'S']],
  ['显示 / 隐藏章节目录', ['Ctrl', 'B']],
  ['显示 / 隐藏设置面板', ['Ctrl', 'Shift', 'B']],
  ['撤销 / 重做', ['Ctrl', 'Z']],
  ['全选正文', ['Ctrl', 'A']],
  ['关闭菜单或对话框', ['Esc']],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="键盘快捷键" eyebrow="SHORTCUTS" onClose={onClose}>
      <p className="modal-lead">所有操作都可以只用键盘完成，写作时不必离开正文。</p>
      <dl className="shortcut-list">
        {SHORTCUTS.map(([label, keys]) => (
          <div className="shortcut-row" key={label as string}>
            <dt>{label}</dt>
            <dd>
              {(keys as string[]).map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="关于 PaperScape" eyebrow="ABOUT" onClose={onClose}>
      <div className="about-hero">
        <span className="about-mark">
          <BrandMark size={46} />
        </span>
        <div>
          <p className="about-name">PaperScape 纸境</p>
          <p className="about-version">0.1.0 · 第一阶段</p>
        </div>
      </div>
      <p className="modal-lead">
        一个安静、轻量的桌面写作空间。把章节、正文和偏好留在本机，把注意力留给文字。
      </p>
      <div className="about-facts">
        <span>Tauri 2</span>
        <span>React 19</span>
        <span>TypeScript</span>
        <span>Tailwind CSS</span>
      </div>
      <p className="modal-footnote">
        本阶段聚焦窗口、布局与基础写作体验。Word 导入导出和复杂背景系统将在后续阶段加入。
      </p>
    </Modal>
  );
}
