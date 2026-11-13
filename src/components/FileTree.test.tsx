import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
