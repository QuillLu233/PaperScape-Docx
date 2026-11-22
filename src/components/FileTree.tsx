import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceNode } from '../workspace/types';
import { baseName } from '../workspace/useDocumentWorkspace';
import { Icon } from './Icon';

interface FileTreeProps {
  root: string;
  tree: WorkspaceNode[];
  activePath: string | null;
  open: boolean;
  loading: boolean;
  onOpenFile: (node: WorkspaceNode) => void;
  onOpenRight: (node: WorkspaceNode) => void;
  onOpenProject: (path: string) => void;
  onRefresh: () => void;
  onReveal: () => void;
  onRevealPath?: (node: WorkspaceNode) => void;
  onClose: () => void;
}

interface TreeRowProps {
  node: WorkspaceNode;
  depth: number;
  activePath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpenFile: (node: WorkspaceNode) => void;
  onContextRequest: (node: WorkspaceNode, x: number, y: number) => void;
  onOpenProject: (path: string) => void;
}

const nameCollator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

/** Folders first, then natural chapter/file order (79 before 113). */
export function sortWorkspaceNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return [...nodes]
    .sort((left, right) => {
      if (left.isDir !== right.isDir) return left.isDir ? -1 : 1;
      return nameCollator.compare(left.name, right.name);
    })
    .map((node) =>
      node.isDir && node.children.length > 0
        ? { ...node, children: sortWorkspaceNodes(node.children) }
        : node,
    );
}

function TreeRow({
  node,
  depth,
  activePath,
  expanded,
  onToggle,
  onOpenFile,
  onContextRequest,
  onOpenProject,
}: TreeRowProps) {
  const isOpen = expanded.has(node.path);
  const isActive = activePath === node.path;
  const isDocx = node.editable;
  return (
    <li>
      <button
        type="button"
        className={`file-row${isActive ? ' is-active' : ''}${isDocx ? ' is-docx' : ''}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        title={node.path}
        aria-expanded={node.isDir ? isOpen : undefined}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextRequest(node, event.clientX, event.clientY);
        }}
        onClick={() => {
          if (node.isProject) {
            onOpenProject(node.path);
          } else if (node.isDir) {
            onToggle(node.path);
          } else if (isDocx) {
            onOpenFile(node);
          }
        }}
      >
        <span className="file-caret" aria-hidden="true">
          {node.isDir && !node.isProject ? (
            <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={10} />
          ) : null}
        </span>
        <Icon
          name={node.isDir ? (node.isProject ? 'project' : 'folder') : 'file'}
          size={14}
        />
        <span className="file-name">{node.name}</span>
        {!node.isDir && !isDocx ? <span className="file-muted">不可编辑</span> : null}
        {node.isProject ? <span className="file-muted">V1 项目</span> : null}
      </button>
      {node.isDir && isOpen && node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expanded={expanded}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              onContextRequest={onContextRequest}
              onOpenProject={onOpenProject}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FileTree({
  root,
  tree,
  activePath,
  open,
  loading,
  onOpenFile,
  onOpenRight,
  onOpenProject,
  onRefresh,
  onReveal,
  onRevealPath,
  onClose,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    node: WorkspaceNode;
    x: number;
    y: number;
  } | null>(null);
  const sortedTree = useMemo(() => sortWorkspaceNodes(tree), [tree]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [contextMenu]);

  useEffect(() => {
    setExpanded(new Set());
  }, [root]);

  const toggle = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = path;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      if (typeof document.execCommand === 'function') document.execCommand('copy');
      helper.remove();
    }
  };

  return (
    <aside
      className={`chapter-sidebar file-sidebar panel${open ? '' : ' is-collapsed'}`}
      aria-label="文件树"
      aria-hidden={!open}
      data-testid="file-tree"
      data-open={open}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="panel-heading">
        <div className="project-heading-copy">
          <p className="panel-kicker">FILES</p>
          <h2 className="panel-title" title={root}>
            {baseName(root) || '文件夹'}
          </h2>
          <p className="panel-subtitle">{root}</p>
        </div>
        <div className="file-heading-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="刷新文件列表"
            title="刷新文件列表"
            disabled={loading}
            onClick={onRefresh}
          >
            <Icon name="refresh" size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="在资源管理器中显示"
            title="在资源管理器中显示"
            onClick={onReveal}
          >
            <Icon name="external" size={14} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="收起文件树"
            title="收起文件树"
            onClick={onClose}
          >
            <Icon name="panel-left" size={16} />
          </button>
        </div>
      </div>

      <nav
        className="chapter-list file-list"
        aria-label="文件列表"
        onContextMenu={(event) => event.preventDefault()}
      >
        {tree.length === 0 ? (
          <p className="file-empty">这个文件夹里还没有可显示的文稿。</p>
        ) : (
          <ul>
            {sortedTree.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                activePath={activePath}
                expanded={expanded}
                onToggle={toggle}
                onOpenFile={onOpenFile}
                onContextRequest={(node, x, y) => setContextMenu({ node, x, y })}
                onOpenProject={onOpenProject}
              />
            ))}
          </ul>
        )}
      </nav>

      {contextMenu ? (
        (() => {
          const node = contextMenu.node;
          const isDocx = !node.isDir && !node.isProject && node.editable;
          const left = Math.min(contextMenu.x, Math.max(8, window.innerWidth - 190));
          const top = Math.min(contextMenu.y, Math.max(8, window.innerHeight - 220));
          return (
            <div
              className="file-context-menu"
              style={{ left, top }}
              role="menu"
              aria-label={`${node.name} 文件菜单`}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {node.isProject ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenProject(node.path);
                    setContextMenu(null);
                  }}
                >
                  打开项目
                </button>
              ) : null}

              {node.isDir && !node.isProject ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggle(node.path);
                    setContextMenu(null);
                  }}
                >
                  {expanded.has(node.path) ? '折叠文件夹' : '展开文件夹'}
                </button>
              ) : null}

              {isDocx ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenFile(node);
                    setContextMenu(null);
                  }}
                >
                  打开
                </button>
              ) : null}

              {isDocx ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenRight(node);
                    setContextMenu(null);
                  }}
                >
                  在右侧打开
                </button>
              ) : null}

              <div className="file-context-separator" role="separator" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (onRevealPath) onRevealPath(node);
                  else onReveal();
                  setContextMenu(null);
                }}
              >
                在资源管理器中显示
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void copyPath(node.path);
                  setContextMenu(null);
                }}
              >
                复制路径
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRefresh();
                  setContextMenu(null);
                }}
              >
                刷新文件列表
              </button>
            </div>
          );
        })()
      ) : null}

      <div className="sidebar-footer">
        <span className="status-dot" aria-hidden="true" />
        <span>真实文件夹 · DOCX 直接编辑</span>
      </div>
    </aside>
  );
}
