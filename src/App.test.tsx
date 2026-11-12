import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('PaperScape shell', () => {
  it('renders the three working areas and the active chapter', async () => {
    render(<App />);

    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('settings-panel')).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('textbox', { name: '章节标题' })).toHaveValue('纸上的清晨');
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '正文编辑器' })).toHaveTextContent(
        '天还没有完全亮',
      ),
    );
    expect(screen.getByText('第 1 章 / 共 3 章')).toBeInTheDocument();
  });

  it('collapses and restores the chapter sidebar from window chrome', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '隐藏章节目录' }));
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'false');
    expect(localStorage.getItem('paperscape.panels.left')).toBe('false');

    await user.click(screen.getByRole('button', { name: '显示章节目录' }));
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'true');
  });

  it('toggles the chapter sidebar with Ctrl+B outside the editor', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByRole('textbox', { name: '正文编辑器' })).toBeInTheDocument());
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(screen.getByTestId('chapter-sidebar')).toHaveAttribute('data-open', 'false');
  });

  it('adds a new chapter and selects it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '新建章节' }));

    expect(screen.getByRole('textbox', { name: '章节标题' })).toHaveValue('新章节 4');
    expect(screen.getByText('第 4 章 / 共 4 章')).toBeInTheDocument();
  });

  it('switches to the dark theme and stores the preference', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '深色' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await waitFor(() => expect(localStorage.getItem('paperscape.theme')).toBe('dark'));
  });

  it('opens the find and replace bar from the edit menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: '正文编辑器' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.click(screen.getByRole('menuitem', { name: /查找与替换/ }));

    expect(screen.getByRole('search', { name: '查找与替换' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '查找内容' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭查找替换' }));
    expect(screen.queryByRole('search', { name: '查找与替换' })).not.toBeInTheDocument();
  });

  it('opens the about dialog from the help menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '帮助' }));
    await user.click(screen.getByRole('menuitem', { name: '关于 PaperScape' }));

    expect(screen.getByRole('dialog', { name: '关于 PaperScape' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭对话框' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
