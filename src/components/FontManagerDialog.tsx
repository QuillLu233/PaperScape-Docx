import { useEffect, useMemo, useState } from 'react';
import type { FontConfig, FontRecord, FontSelection } from '../fonts/types';
import { Icon } from './Icon';

interface FontManagerDialogProps {
  config: FontConfig;
  fonts: FontRecord[];
  importedFonts: FontRecord[];
  loading: boolean;
  error: string;
  onSelect: (target: 'ui' | 'editor', selection: FontSelection) => void;
  onReset: (target: 'ui' | 'editor') => void;
  onImport: () => Promise<FontRecord | null>;
  onRemove: (id: string) => Promise<void>;
  onPreview: (font: FontRecord) => Promise<string>;
  onRefresh: () => void;
  onClose: () => void;
}

export function FontManagerDialog({
  config,
  fonts,
  importedFonts,
  loading,
  error,
  onSelect,
  onReset,
  onImport,
  onRemove,
  onPreview,
  onRefresh,
  onClose,
}: FontManagerDialogProps) {
  const [target, setTarget] = useState<'ui' | 'editor'>('editor');
  const [query, setQuery] = useState('');
  const [previewFamily, setPreviewFamily] = useState('Microsoft YaHei UI');
  const [previewName, setPreviewName] = useState('Microsoft YaHei UI');
  const [previewError, setPreviewError] = useState('');

  const current = config[target];

  useEffect(() => {
    setPreviewFamily(current.name);
    setPreviewName(current.name);
  }, [current.id, current.name, current.source, target]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fonts.filter((font) => !needle || font.name.toLowerCase().includes(needle));
  }, [fonts, query]);

  const choose = (font: FontRecord) => {
    void preview(font);
    onSelect(target, {
      name: font.name,
      source: font.source,
      id: font.id,
      path: font.path,
    });
    setPreviewFamily(font.name);
    setPreviewName(font.name);
  };

  const preview = async (font: FontRecord) => {
    setPreviewError('');
    try {
      const family = await onPreview(font);
      setPreviewFamily(family);
      setPreviewName(font.name);
    } catch (previewFailure) {
      setPreviewError(previewFailure instanceof Error ? previewFailure.message : '字体预览失败');
    }
  };

  const importFont = async () => {
    const record = await onImport();
    if (record) {
      await preview(record);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card font-manager-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="font-manager-title"
      >
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">TYPOGRAPHY</p>
            <h2 id="font-manager-title" className="modal-title">
              字体管理
            </h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭字体管理" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="modal-body font-manager-body">
          <div className="font-target-tabs" role="tablist" aria-label="字体用途">
            <button
              type="button"
              role="tab"
              aria-selected={target === 'editor'}
              className={target === 'editor' ? 'is-active' : ''}
              onClick={() => setTarget('editor')}
            >
              写作正文字体
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={target === 'ui'}
              className={target === 'ui' ? 'is-active' : ''}
              onClick={() => setTarget('ui')}
            >
              界面字体
            </button>
          </div>

          <div className="font-current-row">
            <span>
              当前{target === 'editor' ? '正文' : '界面'}字体：
              <strong>{current.name}</strong>
              <small>{current.source === 'imported' ? '导入字体' : '系统/默认字体'}</small>
            </span>
            <button type="button" className="secondary-button" onClick={() => onReset(target)}>
              恢复默认
            </button>
            <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
              刷新列表
            </button>
            <button type="button" className="primary-button" onClick={() => void importFont()} disabled={loading}>
              导入 TTF / OTF
            </button>
          </div>

          <div className="font-preview" aria-label="字体预览">
            <div className="font-preview-heading">
              <span>预览 · {previewName}</span>
              <span>正文与界面预览</span>
            </div>
            <p style={{ fontFamily: `"${previewFamily}", "Microsoft YaHei UI", sans-serif` }}>
              春江潮水连海平，海上明月共潮生。
            </p>
            <p
              className="font-preview-latin"
              style={{ fontFamily: `"${previewFamily}", "Microsoft YaHei UI", sans-serif` }}
            >
              The quiet page, 2026, 0123456789 — Aa Bb Cc
            </p>
          </div>

          {previewError ? <div className="font-error">{previewError}</div> : null}
          {error ? <div className="font-error">{error}</div> : null}

          <label className="font-search">
            <Icon name="search" size={13} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="搜索字体"
              placeholder="搜索 Windows 或导入字体"
            />
          </label>

          <div className="font-list" role="listbox" aria-label="可用字体">
            {importedFonts.length > 0 ? (
              <div className="font-group-label">导入字体</div>
            ) : null}
            {filtered
              .filter((font) => font.source === 'imported')
              .map((font) => (
                <div className="font-row" key={font.id} role="option" aria-selected={current.id === font.id}>
                  <button type="button" className="font-row-main" onClick={() => void preview(font)}>
                    <strong>{font.name}</strong>
                    <small>TTF/OTF · 仅用于 PaperScape，不写入系统字体</small>
                  </button>
                  <button type="button" className="secondary-button" onClick={() => choose(font)}>
                    设为{target === 'editor' ? '正文' : '界面'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button is-danger"
                    onClick={() => void onRemove(font.id)}
                  >
                    移除
                  </button>
                </div>
              ))}
            {filtered.some((font) => font.source === 'system') ? (
              <div className="font-group-label">Windows 已安装字体</div>
            ) : null}
            {filtered
              .filter((font) => font.source === 'system')
              .map((font) => (
                <div className="font-row" key={font.id} role="option" aria-selected={current.path === font.path}>
                  <button type="button" className="font-row-main" onClick={() => void preview(font)}>
                    <strong>{font.name}</strong>
                    <small>来自 Windows 字体目录</small>
                  </button>
                  <button type="button" className="secondary-button" onClick={() => choose(font)}>
                    设为{target === 'editor' ? '正文' : '界面'}
                  </button>
                </div>
              ))}
            {filtered.length === 0 ? (
              <p className="font-empty">{loading ? '正在读取字体…' : '没有匹配的字体。'}</p>
            ) : null}
          </div>

          <p className="font-license">
            字体版权归原作者所有。导入字体仅保存在 PaperScape 的应用数据目录，不会修改 Windows 系统字体；
            请确认你拥有该字体的使用授权。缺少中文字形的字体将自动使用系统中文回退字体。
          </p>
          <p className="font-license">
            写作字体只改变编辑器显示，不改变 DOCX 原有字体设置；导出字体由“导出 Word 文档”中的字体选项决定。
          </p>
        </div>
      </div>
    </div>
  );
}
