import { useState, type FormEvent } from 'react';
import type { DocxExportOptions, DocxPageSize, DocxPreset } from '../docx/exportDocx';

interface DocxExportDialogProps {
  chapterTitle: string;
  chapterCount: number;
  busy: boolean;
  onExport: (options: DocxExportOptions, scope: 'current' | 'all') => void;
  onClose: () => void;
}

const FONT_OPTIONS = [
  ['Calibri', 'Calibri（英文默认）'],
  ['SimSun', '宋体'],
  ['Microsoft YaHei', '微软雅黑'],
  ['KaiTi', '楷体'],
  ['Georgia', 'Georgia（英文衬线）'],
] as const;

const SIZE_OPTIONS = [10.5, 11, 12, 14] as const;

export function DocxExportDialog({
  chapterTitle,
  chapterCount,
  busy,
  onExport,
  onClose,
}: DocxExportDialogProps) {
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [preset, setPreset] = useState<DocxPreset>('standard');
  const [pageSize, setPageSize] = useState<DocxPageSize>('A4');
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize, setFontSize] = useState(11);
  const [includeTitle, setIncludeTitle] = useState(true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onExport({ preset, pageSize, fontFamily, fontSize, includeTitle }, scope);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="modal-card docx-export-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docx-export-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">EXPORT DOCX</p>
            <h2 id="docx-export-title">导出 Word 文档</h2>
            <p className="history-subtitle">
              {scope === 'current' ? chapterTitle : `全部 ${chapterCount} 章`}
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="关闭导出对话框" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="docx-field">
          <span className="docx-field-label">导出范围</span>
          <div className="docx-segmented" role="group" aria-label="导出范围">
            <button
              type="button"
              className={scope === 'current' ? 'is-active' : ''}
              aria-pressed={scope === 'current'}
              onClick={() => setScope('current')}
            >
              当前章节
            </button>
            <button
              type="button"
              className={scope === 'all' ? 'is-active' : ''}
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
              disabled={chapterCount < 2}
            >
              合并全部
            </button>
          </div>
        </div>

        <div className="docx-field">
          <span className="docx-field-label">排版预设</span>
          <div className="docx-preset-grid" role="group" aria-label="排版预设">
            <button
              type="button"
              className={`docx-preset${preset === 'standard' ? ' is-active' : ''}`}
              aria-pressed={preset === 'standard'}
              onClick={() => setPreset('standard')}
            >
              <strong>标准文档</strong>
              <small>常规页边距 · 1.15 行距</small>
            </button>
            <button
              type="button"
              className={`docx-preset${preset === 'novel' ? ' is-active' : ''}`}
              aria-pressed={preset === 'novel'}
              onClick={() => setPreset('novel')}
            >
              <strong>小说稿件</strong>
              <small>宽页边距 · 1.5 行距 · 首行缩进</small>
            </button>
          </div>
        </div>

        <div className="docx-form-grid">
          <label className="docx-field">
            <span className="docx-field-label">页面规格</span>
            <select
              className="settings-select"
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value as DocxPageSize)}
            >
              <option value="A4">A4</option>
              <option value="Letter">US Letter</option>
            </select>
          </label>
          <label className="docx-field">
            <span className="docx-field-label">正文字体</span>
            <select
              className="settings-select"
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
            >
              {FONT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="docx-field">
            <span className="docx-field-label">正文字号</span>
            <select
              className="settings-select"
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
            >
              {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} pt
                </option>
              ))}
            </select>
          </label>
          <label className="docx-check">
            <input
              type="checkbox"
              checked={includeTitle}
              onChange={(event) => setIncludeTitle(event.target.checked)}
            />
            <span>包含章节标题</span>
          </label>
        </div>

        <p className="settings-note">
          导出的是真正的 Office Open XML（.docx）；软件背景、纸张颜色和界面主题不会写入文档。
        </p>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? '生成中…' : '导出 .docx'}
          </button>
        </div>
      </form>
    </div>
  );
}
