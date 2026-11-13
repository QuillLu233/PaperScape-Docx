import { useEffect, useMemo, useState } from 'react';
import type { RecentProject } from '../project/types';
import type { RecentItem } from '../workspace/types';
import { chooseFolder, getDefaultProjectParent, isTauriRuntime } from '../project/api';
import { hasLegacyWorkspace } from '../project/legacy';
import { joinProjectPath } from '../project/types';
import { Icon, BrandMark } from './Icon';

interface ProjectLauncherProps {
  recent: RecentProject[];
  recentItems: RecentItem[];
  loading: boolean;
  error: string;
  onCreate: (parent: string, name: string) => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onOpenPath: (path: string) => void;
  onNewDocument: () => void;
  onOpenDocx: () => void;
  onOpenFolder: () => void;
  onOpenRecentItem: (item: RecentItem) => void;
  defaultDocumentsDir: string;
  onChooseDefaultDocumentsDir: () => void;
  onImportLegacy: () => void;
  onClearError: () => void;
}

interface RecentDisplay {
  key: string;
  kind: 'project' | 'docx' | 'folder';
  name: string;
  detail: string;
  path: string;
  open: () => void;
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN');
}

function shortPath(path: string): string {
  if (path.length <= 52) return path;
  return `…${path.slice(-48)}`;
}

export function ProjectLauncher({
  recent,
  recentItems,
  loading,
  error,
  onCreate,
  onOpen,
  onOpenRecent,
  onOpenPath,
  onNewDocument,
  onOpenDocx,
  onOpenFolder,
  onOpenRecentItem,
  defaultDocumentsDir,
  onChooseDefaultDocumentsDir,
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

  const recentDisplay = useMemo(() => {
    const items: RecentDisplay[] = [];
    const seen = new Set<string>();
    for (const project of recent) {
      const key = project.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key: `project:${project.path}`,
        kind: 'project',
        name: project.name,
        detail: `${project.chapterCount} 章 · ${formatCount(project.characterCount)} 字`,
        path: project.path,
        open: () => onOpenRecent(project.path),
      });
    }
    for (const item of recentItems) {
      const key = item.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key: `${item.kind}:${item.path}`,
        kind: item.kind,
        name: item.name,
        detail: item.kind === 'folder' ? '文件夹' : 'Word 文档',
        path: item.path,
        open: () => onOpenRecentItem(item),
      });
    }
    return items.slice(0, 10);
  }, [onOpenRecent, onOpenRecentItem, recent, recentItems]);

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
      <div className="launcher-card launcher-compact">
        <div className="launcher-brand">
          <span className="brand-mark" aria-hidden="true">
            <BrandMark size={30} />
          </span>
          <div>
            <p className="panel-kicker">PAPERSCAPE</p>
            <h1>纸境</h1>
          </div>
        </div>
        <p className="launcher-lead">写下今天的第一句话。文件保存在你自己的电脑上。</p>

        {!desktop ? (
          <div className="launcher-notice" role="status">
            文件管理需要在 PaperScape 桌面应用中使用。
          </div>
        ) : null}

        <div className="launcher-actions launcher-doc-actions">
          <button
            type="button"
            className="launcher-primary"
            disabled={!desktop || loading}
            onClick={onNewDocument}
          >
            <Icon name="file" size={17} />
            <span>新建文稿</span>
          </button>
          <button
            type="button"
            className="launcher-secondary"
            disabled={!desktop || loading}
            onClick={onOpenDocx}
          >
            <Icon name="file" size={17} />
            <span>打开文件</span>
          </button>
          <button
            type="button"
            className="launcher-secondary"
            disabled={!desktop || loading}
            onClick={onOpenFolder}
          >
            <Icon name="folder" size={17} />
            <span>打开文件夹</span>
          </button>
        </div>

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

        <section className="launcher-recent" aria-labelledby="recent-heading">
          <div className="launcher-section-heading">
            <h2 id="recent-heading">最近使用</h2>
            <span>{recentDisplay.length ? `${recentDisplay.length} 个` : '暂无'}</span>
          </div>
          {recentDisplay.length === 0 ? (
            <p className="launcher-empty">还没有最近文稿。新建文稿或打开一个文件夹开始。</p>
          ) : (
            <div className="recent-list">
              {recentDisplay.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="recent-item"
                  title={item.path}
                  disabled={loading}
                  onClick={item.open}
                >
                  <span className="recent-icon" aria-hidden="true">
                    <Icon
                      name={
                        item.kind === 'project' ? 'project' : item.kind === 'folder' ? 'folder' : 'file'
                      }
                      size={16}
                    />
                  </span>
                  <span className="recent-copy">
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                    <small className="recent-short-path">
                      {item.kind === 'project' ? '本地项目' : shortPath(item.path)}
                    </small>
                  </span>
                  <Icon name="chevron-right" size={14} />
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="launcher-footnote">不会自动移动、重命名或覆盖你的文稿。</p>

        <details className="launcher-more">
          <summary>旧版项目与设置</summary>
          <div className="launcher-more-actions">
            <button type="button" className="secondary-button" onClick={onOpen} disabled={loading}>
              打开项目
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setCreating((current) => !current)}
              disabled={loading}
            >
              新建项目
            </button>
            {legacyAvailable ? (
              <button type="button" className="secondary-button" onClick={onImportLegacy} disabled={loading}>
                导入旧草稿
              </button>
            ) : null}
          </div>
          <div className="launcher-default-dir">
            <span>
              默认文稿目录：<strong title={defaultDocumentsDir}>{defaultDocumentsDir || '未设置'}</strong>
            </span>
            <button type="button" className="secondary-button" onClick={onChooseDefaultDocumentsDir}>
              更改…
            </button>
          </div>
          <details className="launcher-manual-open">
            <summary>直接输入项目文件夹路径</summary>
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
                placeholder="C:\Users\...\项目.paperscape"
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
                if (parent.trim() && name.trim()) onCreate(parent.trim(), name.trim());
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
        </details>
      </div>
    </div>
  );
}
