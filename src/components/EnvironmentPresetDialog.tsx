import { useEffect, useRef, useState } from 'react';
import type { EnvironmentPreset } from '../types';
import { OFFICIAL_ENVIRONMENTS, environmentThumbnailStyle } from '../appearance/environmentPresets';
import { Icon } from './Icon';

interface EnvironmentPresetDialogProps {
  open: boolean;
  currentId: string;
  presets: EnvironmentPreset[];
  onClose: () => void;
  onApply: (preset: EnvironmentPreset) => void;
  onSaveCurrent: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (preset: EnvironmentPreset) => EnvironmentPreset;
  onExport: (id: string) => string | null;
  onImport: (text: string) => EnvironmentPreset;
  onRestoreDefault: () => void;
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function EnvironmentPresetDialog({
  open,
  currentId,
  presets,
  onClose,
  onApply,
  onSaveCurrent,
  onRename,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  onRestoreDefault,
}: EnvironmentPresetDialogProps) {
  const [tab, setTab] = useState<'official' | 'custom'>('official');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const preset = onImport(text);
      setTab('custom');
      setError(`已导入「${preset.name}」`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '预设导入失败');
    }
  };

  return (
    <div
      className="environment-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="environment-dialog" role="dialog" aria-modal="true" aria-label="环境预设">
        <header className="environment-dialog-head">
          <div>
            <p className="panel-kicker">ENVIRONMENT</p>
            <h2>环境预设</h2>
          </div>
          <button type="button" className="icon-button" aria-label="关闭环境预设" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="environment-tabs" role="tablist" aria-label="预设分类">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'official'}
            className={tab === 'official' ? 'is-active' : ''}
            onClick={() => setTab('official')}
          >
            官方预设
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'custom'}
            className={tab === 'custom' ? 'is-active' : ''}
            onClick={() => setTab('custom')}
          >
            我的预设
          </button>
        </div>

        <div className="environment-dialog-scroll">
          {tab === 'official' ? (
            <div className="environment-grid">
              {OFFICIAL_ENVIRONMENTS.map((preset, index) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`environment-card${preset.id === currentId ? ' is-active' : ''}`}
                  aria-pressed={preset.id === currentId}
                  onClick={() => {
                    onApply(preset);
                    onClose();
                  }}
                >
                  <span className="environment-thumb" style={environmentThumbnailStyle(preset)}>
                    <span className="environment-thumb-ui" style={{ background: preset.uiColors.titlebar }} />
                    <span className="environment-thumb-paper" style={{ background: preset.paper.color }} />
                  </span>
                  <span className="environment-card-label">
                    <span className="environment-number">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{preset.name}</strong>
                    {preset.id === currentId ? <Icon name="check" size={12} /> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : presets.length === 0 ? (
            <p className="environment-empty">还没有个人预设。调整当前环境后可以保存为我的预设。</p>
          ) : (
            <div className="environment-grid">
              {presets.map((preset) => (
                <div
                  className={`environment-card environment-card-custom${
                    preset.id === currentId ? ' is-active' : ''
                  }`}
                  key={preset.id}
                >
                  <button
                    type="button"
                    className="environment-card-apply"
                    aria-pressed={preset.id === currentId}
                    onClick={() => {
                      onApply(preset);
                      onClose();
                    }}
                  >
                    <span className="environment-thumb" style={environmentThumbnailStyle(preset)}>
                      <span className="environment-thumb-ui" style={{ background: preset.uiColors.titlebar }} />
                      <span className="environment-thumb-paper" style={{ background: preset.paper.color }} />
                    </span>
                    <span className="environment-card-label">
                      <strong>{preset.name}</strong>
                      {preset.id === currentId ? <Icon name="check" size={12} /> : null}
                    </span>
                  </button>
                  <div className="environment-card-actions">
                    <button
                      type="button"
                      aria-label={`重命名 ${preset.name}`}
                      onClick={() => {
                        setRenaming(preset.id);
                        setRenameValue(preset.name);
                      }}
                    >
                      重命名
                    </button>
                    <button type="button" onClick={() => onDuplicate(preset)}>
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const text = onExport(preset.id);
                        if (text) downloadText(`${preset.name}.paperscape-environment.json`, text);
                      }}
                    >
                      导出
                    </button>
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => {
                        if (window.confirm(`删除「${preset.name}」？`)) onDelete(preset.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                  {renaming === preset.id ? (
                    <form
                      className="environment-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onRename(preset.id, renameValue);
                        setRenaming(null);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label="预设新名称"
                        autoFocus
                      />
                      <button type="submit">保存</button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className="appearance-error environment-error">{error}</p> : null}

        <footer className="environment-dialog-foot">
          <div className="environment-save-current">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="我的预设名称"
              aria-label="我的预设名称"
              maxLength={40}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (!name.trim()) {
                  setError('请先填写预设名称');
                  return;
                }
                onSaveCurrent(name);
                setName('');
                setTab('custom');
                setError('已保存当前环境');
              }}
            >
              保存当前
            </button>
          </div>
          <div className="environment-foot-actions">
            <button type="button" className="text-button" onClick={() => importRef.current?.click()}>
              导入预设
            </button>
            <button type="button" className="text-button" onClick={onRestoreDefault}>
              恢复默认
            </button>
          </div>
          <input
            ref={importRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void importFile(file);
            }}
          />
        </footer>
      </section>
    </div>
  );
}
