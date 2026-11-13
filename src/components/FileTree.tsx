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
  onOpenProject: (path: string) => void;
  onRefresh: () => void;
  onReveal: () => void;
  onClose: () => void;
}

interface TreeRowProps {
  node: WorkspaceNode;
  depth: number;
  activePath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpenFile: (node: WorkspaceNode) => void;
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
  onOpenProject,
  onRefresh,
  onReveal,
  onClose,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sortedTree = useMemo(() => sortWorkspaceNodes(tree), [tree]);

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

  return (
    <aside
      className={`chapter-sidebar file-sidebar panel${open ? '' : ' is-collapsed'}`}
      aria-label="文件树"
      aria-hidden={!open}
      data-testid="file-tree"
      data-open={open}
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

      <nav className="chapter-list file-list" aria-label="文件列表">
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
                onOpenProject={onOpenProject}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" aria-hidden="true" />
        <span>真实文件夹 · DOCX 直接编辑</span>
      </div>
    </aside>
  );
}
