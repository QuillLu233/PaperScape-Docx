import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEvent } from '@testing-library/dom';
import { FileTree } from './FileTree';
import type { WorkspaceNode } from '../workspace/types';

const tree: WorkspaceNode[] = [
  {
    name: '章节',
    path: 'C:\\Docs\\章节',
    isDir: true,
    editable: false,
    isProject: false,
    extension: '',
    size: 0,
    modified: 0,
    children: [
      {
        name: '第一章.docx',
        path: 'C:\\Docs\\章节\\第一章.docx',
        isDir: false,
        editable: true,
        isProject: false,
        extension: 'docx',
        size: 10,
        modified: 1,
        children: [],
      },
    ],
  },
  {
    name: '说明.txt',
    path: 'C:\\Docs\\说明.txt',
    isDir: false,
    editable: false,
    isProject: false,
    extension: 'txt',
    size: 4,
    modified: 1,
    children: [],
  },
];

describe('FileTree', () => {
  it('expands folders and opens only editable DOCX files', async () => {
    const user = userEvent.setup();
    const onOpenFile = vi.fn();
    const onOpenProject = vi.fn();
    render(
      <FileTree
        root="C:\\Docs"
        tree={tree}
        activePath={null}
        open
        loading={false}
        onOpenFile={onOpenFile}
        onOpenRight={vi.fn()}
        onOpenProject={onOpenProject}
        onRefresh={vi.fn()}
        onReveal={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('第一章.docx')).toBeNull();
    await user.click(screen.getByText('章节'));
    await user.click(await screen.findByText('第一章.docx'));
    expect(onOpenFile).toHaveBeenCalledWith(tree[0].children[0]);

    await user.click(screen.getByText('说明.txt'));
    expect(onOpenFile).toHaveBeenCalledTimes(1);
    expect(onOpenProject).not.toHaveBeenCalled();
  });

  it('offers opening a DOCX in the right pane from the context menu', async () => {
    const user = userEvent.setup();
    const onOpenRight = vi.fn();
    render(
      <FileTree
        root="C:\\Docs"
        tree={tree}
        activePath={null}
        open
        loading={false}
        onOpenFile={vi.fn()}
        onOpenRight={onOpenRight}
        onOpenProject={vi.fn()}
        onRefresh={vi.fn()}
        onReveal={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByText('章节'));
    fireEvent.contextMenu(screen.getByText('第一章.docx'));
    await user.click(await screen.findByText('在右侧打开'));
    expect(onOpenRight).toHaveBeenCalledWith(tree[0].children[0]);
  });

  it('restores file actions for non-DOCX rows and suppresses the native menu', async () => {
    const user = userEvent.setup();
    const onRevealPath = vi.fn();
    render(
      <FileTree
        root="C:\\Docs"
        tree={tree}
        activePath={null}
        open
        loading={false}
        onOpenFile={vi.fn()}
        onOpenRight={vi.fn()}
        onOpenProject={vi.fn()}
        onRefresh={vi.fn()}
        onReveal={vi.fn()}
        onRevealPath={onRevealPath}
        onClose={vi.fn()}
      />,
    );

    const target = screen.getByText('说明.txt');
    const contextEvent = createEvent.contextMenu(target);
    fireEvent(target, contextEvent);
    expect(contextEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('复制路径')).toBeInTheDocument();
    expect(screen.getByText('刷新文件列表')).toBeInTheDocument();

    await user.click(screen.getByText('在资源管理器中显示'));
    expect(onRevealPath).toHaveBeenCalledWith(tree[1]);
  });
});