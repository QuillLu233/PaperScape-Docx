import { useEffect, useMemo, useState } from 'react';
import type { RecentProject } from '../project/types';
import { chooseFolder, getDefaultProjectParent, isTauriRuntime } from '../project/api';
import { hasLegacyWorkspace } from '../project/legacy';
import { joinProjectPath } from '../project/types';
import { Icon, BrandMark } from './Icon';

interface ProjectLauncherProps {
  recent: RecentProject[];
  loading: boolean;
  error: string;
  onCreate: (parent: string, name: string) => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onOpenPath: (path: string) => void;
  onImportLegacy: () => void;
  onClearError: () => void;
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

export function ProjectLauncher({
  recent,
  loading,
  error,
  onCreate,
  onOpen,
  onOpenRecent,
  onOpenPath,
  onImportLegacy,
  onClearError,
}: ProjectLauncherProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('我的长篇');
  const [parent, setParent] = useState('');
  const [manualPath, setManualPath] = useState('');
  const [localError, setLocalError] = useState('');
  const desktop = isTauriRuntime();
  const legacyAvailable = useMemo(() => hasLegacyWorkspace(), []);

  useEffect(() => {
    if (!desktop) return;
    void getDefaultProjectParent()
      .then((value) => setParent((current) => current || value))
      .catch(() => undefined);
  }, [desktop]);

  const pickParent = async () => {
    setLocalError('');
    try {
      const selected = await chooseFolder('选择项目保存位置');
      if (selected) setParent(selected);
    } catch (pickError) {
      setLocalError(pickError instanceof Error ? pickError.message : '无法打开文件夹选择器');
    }
  };

  return (
    <div className="launcher">
      <div className="launcher-card">
        <div className="launcher-brand">
          <span className="brand-mark" aria-hidden="true">
            <BrandMark size={30} />
          </span>
          <div>
            <p className="panel-kicker">PAPERSCAPE</p>
            <h1>纸境</h1>
          </div>
        </div>
        <p className="launcher-lead">
          一个安静、可靠的长篇写作空间。项目、章节和背景都保存在本机，正文以 Tiptap JSON 独立保存。
        </p>

        {!desktop ? (
          <div className="launcher-notice" role="status">
            项目管理需要在 PaperScape 桌面应用中使用；浏览器预览不提供本地文件访问。
          </div>
        ) : null}

        {error ? (
          <div className="launcher-error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="关闭错误提示" onClick={onClearError}>
              <Icon name="close" size={12} />
            </button>
          </div>
        ) : null}
        {localError ? (
          <div className="launcher-error" role="alert">
            {localError}
          </div>
        ) : null}

        <div className="launcher-actions">
          <button
            type="button"
            className="launcher-primary"
            disabled={!desktop || loading}
            onClick={() => setCreating((current) => !current)}
          >
            <Icon name="plus" size={17} />
            <span>新建项目</span>
          </button>
          <button
            type="button"
            className="launcher-secondary"
            disabled={!desktop || loading}
            onClick={onOpen}
          >
            <Icon name="project" size={17} />
            <span>打开项目</span>
          </button>
        </div>

        {legacyAvailable ? (
          <button type="button" className="launcher-legacy" onClick={onImportLegacy} disabled={loading}>
            <Icon name="history" size={13} />
            导入第三阶段留在本机的旧草稿
          </button>
        ) : null}

        <details className="launcher-manual-open">
          <summary>选择器没有出现？直接输入项目文件夹路径</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (manualPath.trim()) onOpenPath(manualPath.trim());
            }}
          >
            <input
              value={manualPath}
              onChange={(event) => setManualPath(event.target.value)}
              aria-label="项目文件夹路径"
              placeholder="C:\Users\...\我的长篇.paperscape"
            />
            <button type="submit" className="secondary-button" disabled={!manualPath.trim()}>
              打开
            </button>
          </form>
        </details>

        {creating ? (
          <form
            className="launcher-create"
            onSubmit={(event) => {
              event.preventDefault();
              if (parent.trim() && name.trim()) {
                onCreate(parent.trim(), name.trim());
              }
            }}
          >
            <label>
              <span>项目名称</span>
              <input
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                aria-label="项目名称"
                autoFocus
              />
            </label>
            <label>
              <span>保存位置</span>
              <div className="launcher-path-row">
                <input
                  value={parent}
                  onChange={(event) => setParent(event.target.value)}
                  aria-label="项目保存位置"
                  placeholder="选择保存项目的文件夹"
                />
                <button type="button" className="secondary-button" onClick={() => void pickParent()}>
                  选择…
                </button>
              </div>
            </label>
            <p className="launcher-path-preview">
              将创建：{parent ? joinProjectPath(parent, name) : '请选择保存位置'}
            </p>
            <div className="launcher-form-actions">
              <button type="button" className="secondary-button" onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={!parent.trim() || !name.trim() || loading}
              >
                {loading ? '创建中…' : '创建项目'}
              </button>
            </div>
          </form>
        ) : null}

        <section className="launcher-recent" aria-labelledby="recent-heading">
          <div className="launcher-section-heading">
            <h2 id="recent-heading">最近项目</h2>
            <span>{recent.length ? `${recent.length} 个` : '暂无'}</span>
          </div>
          {recent.length === 0 ? (
            <p className="launcher-empty">还没有打开过项目。新建一个项目，或选择已有的 .paperscape 文件夹。</p>
          ) : (
            <div className="recent-list">
              {recent.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="recent-item"
                  title={item.path}
                  disabled={loading}
                  onClick={() => onOpenRecent(item.path)}
                >
                  <span className="recent-icon" aria-hidden="true">
                    <Icon name="project" size={16} />
                  </span>
                  <span className="recent-copy">
                    <strong>{item.name}</strong>
                    <small>
                      {item.chapterCount} 章 · {formatCount(item.characterCount)} 字
                    </small>
                    <small className="recent-path">{item.path}</small>
                  </span>
                  <Icon name="chevron-right" size={14} />
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="launcher-footnote">
          项目是本地文件夹，包含 project.json、独立章节 JSON、历史版本和回收目录。不会覆盖原始 Word 文件。
        </p>
      </div>
    </div>
  );
}
