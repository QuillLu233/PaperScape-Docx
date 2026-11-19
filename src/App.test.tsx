import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fake = vi.hoisted(() => {
  const textDoc = (text: string) => ({
    type: 'doc',
    content: text
      ? [{ type: 'paragraph', content: [{ type: 'text', text }] }]
      : [{ type: 'paragraph' }],
  });
  const makeChapter = (id: string, title: string, text: string, characterCount: number) => ({
    version: 1,
    id,
    title,
    doc: textDoc(text),
    updatedAt: 1,
    characterCount,
    excerpt: text,
  });
  const chapters = [
    makeChapter('chapter-morning', '纸上的清晨', '天还没有完全亮，窗外的树影先醒了过来。', 19),
    makeChapter('chapter-wind', '风经过书桌', '下午的风把窗帘吹起一角。', 12),
    makeChapter('chapter-unfinished', '未完的句子', '有些句子需要等一等。', 10),
  ];
  let active = chapters[0];
  let meta: any = {
    version: 1,
    id: 'project-test',
    name: '测试长篇',
    createdAt: 1,
    updatedAt: 1,
    sessionClean: true,
    activeChapterId: active.id,
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      file: `chapters/${chapter.id}.json`,
      updatedAt: chapter.updatedAt,
      characterCount: chapter.characterCount,
      excerpt: chapter.excerpt,
    })),
  };
  const opened = () => ({
    path: 'C:\\Tests\\长篇.paperscape',
    meta,
    activeChapter: active,
    recovery: [],
    warnings: [],
    metaRecovered: false,
    activeRecovered: false,
  });
  const api = {
    isTauriRuntime: () => true,
    chooseFolder: vi.fn(async () => 'C:\\Tests\\长篇.paperscape'),
    getDefaultProjectParent: vi.fn(async () => 'C:\\Tests'),
    createProject: vi.fn(async () => opened()),
    openProject: vi.fn(async () => opened()),
    listRecentProjects: vi.fn(async () => []),
    saveChapter: vi.fn(async (_path, input) => {
      active = {
        ...active,
        ...input,
        updatedAt: 2,
        title: input.title || active.title,
      };
      meta = {
        ...meta,
        activeChapterId: active.id,
        chapters: meta.chapters.map((chapter: any) =>
          chapter.id === active.id
            ? {
                ...chapter,
                title: active.title,
                characterCount: active.characterCount,
                excerpt: active.excerpt,
                updatedAt: active.updatedAt,
              }
            : chapter,
        ),
      };
      return { chapter: active, meta, historyFile: null, recovered: false, warning: null };
    }),
    loadChapter: vi.fn(async () => ({ chapter: active, recovered: false, warning: null })),
    savePreferences: vi.fn(async (_path: string, appearance: any, settings: any, activeChapterId: string | null) => {
      meta = { ...meta, appearance, settings, activeChapterId: activeChapterId ?? meta.activeChapterId };
      return meta;
    }),
    createChapter: vi.fn(async (_path, title) => {
      active = makeChapter(`chapter-${meta.chapters.length + 1}`, title, '', 0);
      meta = {
        ...meta,
        activeChapterId: active.id,
        chapters: [...meta.chapters, {
          id: active.id,
          title: active.title,
          file: `chapters/${active.id}.json`,
          updatedAt: active.updatedAt,
          characterCount: 0,
          excerpt: '',
        }],
      };
      return { chapter: active, meta };
    }),
    renameChapter: vi.fn(async (_path, chapterId, title) => {
      meta = {
        ...meta,
        chapters: meta.chapters.map((chapter: any) =>
          chapter.id === chapterId ? { ...chapter, title } : chapter,
        ),
      };
      if (active.id === chapterId) active = { ...active, title };
      return meta;
    }),
    reorderChapters: vi.fn(async (_path: string, orderedIds: string[]) => {
      meta = {
        ...meta,
        chapters: orderedIds.map((id) => meta.chapters.find((chapter: any) => chapter.id === id)),
      };
      return meta;
    }),
    deleteChapter: vi.fn(async (_path, chapterId) => {
      meta = {
        ...meta,
        chapters: meta.chapters.filter((chapter: any) => chapter.id !== chapterId),
      };
      return { meta, activeChapter: active, warnings: [] };
    }),
    closeProject: vi.fn(async () => meta),
    listHistory: vi.fn(async () => []),
    restoreHistory: vi.fn(async () => ({ chapter: active, recovered: true, warning: null })),
    restoreRecovery: vi.fn(async () => ({ chapter: active, recovered: true, warning: null })),
    discardRecovery: vi.fn(async () => undefined),
    __reset: () => {
      active = chapters[0];
      meta = {
        version: 1,
        id: 'project-test',
        name: '测试长篇',
        createdAt: 1,
        updatedAt: 1,
        sessionClean: true,
        activeChapterId: active.id,
        chapters: chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          file: `chapters/${chapter.id}.json`,
          updatedAt: chapter.updatedAt,
          characterCount: chapter.characterCount,
          excerpt: chapter.excerpt,
        })),
      };
      api.openProject.mockClear();
      api.chooseFolder.mockClear();
      api.saveChapter.mockClear();
    },
  };
  return { api };
});

vi.mock('./project/api', () => fake.api);

import App from './App';

async function openApp(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(screen.getByText('旧版项目与设置'));
  await user.click(screen.getByRole('button', { name: '打开项目' }));
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: '正文编辑器' })).toHaveTextContent(
      '天还没有完全亮',
    ),
  );
}

describe('PaperScape shell', () => {
  beforeEach(() => {
    localStorage.clear();
    fake.api.__reset();
  });

  it('opens the last project on startup when the setting is enabled', async () => {
    localStorage.setItem(
      'paperscape.lastSession',
      JSON.stringify({ kind: 'project', path: 'C:\\Tests\\长篇.paperscape' }),
    );
    localStorage.setItem('paperscape.openLastSession', 'true');
    render(<App />);
    await waitFor(
      () =>
        expect(screen.getByRole('textbox', { name: '正文编辑器' })).toHaveTextContent(
          '天还没有完全亮',
        ),
      { timeout: 1500 },
    );
    expect(fake.api.openProject).toHaveBeenCalledWith('C:\\Tests\\长篇.paperscape');
  });

  it('renders the three working areas and the active chapter', async () => {
    const user = userEvent.setup();
    await openApp(user);

    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('settings-panel')).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('textbox', { name: '章节标题' })).toHaveValue('纸上的清晨');
    expect(screen.getByText('第 1 章 / 共 3 章')).toBeInTheDocument();
  });

  it('zooms the document without changing UI zoom', async () => {
    const user = userEvent.setup();
    await openApp(user);
    const zoom = screen.getByRole('combobox', { name: '文稿缩放' });
    expect(zoom).toHaveValue('100');
    fireEvent.keyDown(window, { key: '=', ctrlKey: true });
    expect(zoom).toHaveValue('110');
    fireEvent.keyDown(window, { key: '0', ctrlKey: true });
    expect(zoom).toHaveValue('100');
    expect(localStorage.getItem('paperscape.uiZoom')).toBe('110');
  });

  it('changes UI zoom independently from document zoom', async () => {
    const user = userEvent.setup();
    await openApp(user);
    fireEvent.keyDown(window, { key: '4', ctrlKey: true, altKey: true });
    await waitFor(() => expect(localStorage.getItem('paperscape.uiZoom')).toBe('150'));
    expect(screen.getByRole('combobox', { name: '文稿缩放' })).toHaveValue('100');
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.5');
  });

  it('toggles focus mode without rebuilding the editor and preserves IME Escape', async () => {
    const user = userEvent.setup();
    await openApp(user);
    const editor = screen.getByRole('textbox', { name: '正文编辑器' });
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true });
    expect(document.querySelector('.app-shell')).toHaveClass('is-focus-mode');
    expect(screen.getByRole('textbox', { name: '正文编辑器' })).toBe(editor);
    expect(screen.getByRole('slider', { name: /纸张/ })).toHaveValue('85');
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(document.querySelector('.app-shell')).toHaveClass('is-focus-mode');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.app-shell')).not.toHaveClass('is-focus-mode');
    expect(screen.getByRole('textbox', { name: '正文编辑器' })).toBe(editor);
  });

  it('collapses and restores the chapter sidebar from window chrome', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: '隐藏章节目录' }));
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'false');
    expect(localStorage.getItem('paperscape.panels.left')).toBe('false');

    await user.click(screen.getByRole('button', { name: '显示章节目录' }));
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'true');
  });

  it('toggles the chapter sidebar with Ctrl+B outside the editor', async () => {
    const user = userEvent.setup();
    await openApp(user);

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'false');
  });

  it('adds a new chapter and selects it', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: '新建章节' }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '章节标题' })).toHaveValue('第 4 章'),
    );
    expect(screen.getByText('第 4 章 / 共 4 章')).toBeInTheDocument();
  });

  it('switches to the dark theme and stores the preference', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: '深色' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await waitFor(() => expect(localStorage.getItem('paperscape.theme')).toBe('dark'));
  });

  it('switches writing modes while keeping the editor mounted', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: /沉浸式/ }));
    expect(screen.getByTestId('chapter-sidebar').closest('.app-shell')).toHaveClass(
      'mode-immersive',
    );
    expect(screen.getByRole('textbox', { name: '正文编辑器' })).toHaveTextContent(
      '天还没有完全亮',
    );

    await user.click(screen.getByRole('button', { name: /纸张式/ }));
    expect(screen.getByTestId('chapter-sidebar').closest('.app-shell')).toHaveClass('mode-paper');
    expect(screen.getByRole('textbox', { name: '正文编辑器' })).toHaveTextContent(
      '天还没有完全亮',
    );
  });

  it('enters and exits focus writing mode from the window controls', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: '进入专注写作' }));
    expect(document.querySelector('.app-shell')).toHaveClass('is-focus-mode');
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'false');

    await user.click(screen.getByRole('button', { name: '退出专注 (Esc)' }));
    expect(document.querySelector('.app-shell')).not.toHaveClass('is-focus-mode');
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'true');
  });

  it('opens the find and replace bar from the edit menu', async () => {
    const user = userEvent.setup();
    await openApp(user);

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.click(screen.getByRole('menuitem', { name: /查找与替换/ }));

    expect(screen.getByRole('search', { name: '查找与替换' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '查找内容' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭查找替换' }));
    expect(screen.queryByRole('search', { name: '查找与替换' })).not.toBeInTheDocument();
  });

  it('shows creator credit and opens the branded about dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Created by QuillLulu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '帮助' }));
    await user.click(screen.getByRole('menuitem', { name: '关于纸境' }));

    expect(screen.getByRole('dialog', { name: '关于纸境' })).toBeInTheDocument();
    expect(screen.getByText('纸境 PaperScape')).toBeInTheDocument();
    expect(screen.getByText('版本 2.0.0-dev.2')).toBeInTheDocument();
    expect(screen.getByText('创作者：QuillLulu')).toBeInTheDocument();
    expect(screen.getByText('Copyright © 2026 QuillLulu')).toBeInTheDocument();
    expect(screen.getByText('独立设计 · AI 辅助开发')).toBeInTheDocument();
    expect(screen.getAllByText('Created by QuillLulu').length).toBeGreaterThan(1);
    await user.click(screen.getByRole('button', { name: '关闭对话框' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
