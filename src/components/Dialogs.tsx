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
  ['查找与替换', ['Ctrl', 'F']],
  ['加粗', ['Ctrl', 'B']],
  ['斜体 / 下划线', ['Ctrl', 'I', '/', 'Ctrl', 'U']],
  ['撤销 / 重做', ['Ctrl', 'Z', '/', 'Ctrl', 'Shift', 'Z']],
  ['全选正文', ['Ctrl', 'A']],
  ['章节目录（编辑区外）', ['Ctrl', 'B']],
  ['设置面板', ['Ctrl', 'Shift', 'B']],
  ['专注写作', ['Ctrl', 'Shift', 'F']],
  ['退出专注 / 关闭浮层', ['Esc']],
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
          <p className="about-version">0.3.0 · 第三阶段</p>
        </div>
      </div>
      <p className="modal-lead">
        一个安静、轻量的桌面写作空间。把章节、正文和偏好留在本机，把注意力留给文字。
      </p>
      <div className="about-facts">
        <span>Tauri 2</span>
        <span>React 19</span>
        <span>Tiptap 3</span>
        <span>TypeScript</span>
        <span>Tailwind CSS</span>
      </div>
      <p className="modal-footnote">
        本阶段新增沉浸式与纸张式双模式、背景管理、专注写作、自定义主题和页面设置。
      </p>
    </Modal>
  );
}
