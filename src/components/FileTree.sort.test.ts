import { describe, expect, it } from 'vitest';
import { sortWorkspaceNodes } from './FileTree';
import type { WorkspaceNode } from '../workspace/types';

function node(name: string, isDir: boolean, children: WorkspaceNode[] = []): WorkspaceNode {
  return {
    name,
    path: `C:\\Docs\\${name}`,
    isDir,
    editable: !isDir,
    isProject: false,
    extension: isDir ? '' : 'docx',
    size: 0,
    modified: 0,
    children,
  };
}

describe('FileTree sorting', () => {
  it('puts folders first and sorts chapter numbers naturally', () => {
    const sorted = sortWorkspaceNodes([
      node('第113章.docx', false),
      node('第79章.docx', false),
      node('第120章.docx', false),
      node('分篇', true, [node('第9章.docx', false), node('第10章.docx', false)]),
    ]);
    expect(sorted.map((item) => item.name)).toEqual([
      '分篇',
      '第79章.docx',
      '第113章.docx',
      '第120章.docx',
    ]);
    expect(sorted[0].children.map((item) => item.name)).toEqual(['第9章.docx', '第10章.docx']);
  });
});
