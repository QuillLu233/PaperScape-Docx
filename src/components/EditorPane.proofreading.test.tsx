import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorPane } from './EditorPane';
import { DEFAULT_APPEARANCE } from '../appearance/presets';
import { DEFAULT_SETTINGS } from '../types';

function makeChapter() {
  return {
    version: 1,
    id: 'proofreading-chapter',
    title: '校对测试',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '我们的的稿子。' }],
        },
      ],
    },
    updatedAt: 1,
    characterCount: 7,
    excerpt: '我们的的稿子。',
  };
}

describe('EditorPane proofreading integration', () => {
  it('marks the current paragraph and exposes ignore/dictionary suggestions', async () => {
    const onIgnore = vi.fn();
    const onAdd = vi.fn();
    render(
      <EditorPane
        chapter={makeChapter()}
        index={0}
        total={1}
        settings={DEFAULT_SETTINGS}
        appearance={DEFAULT_APPEARANCE}
        focusMode={false}
        proofreadingEnabled
        proofreadingDictionary={[]}
        proofreadingIgnored={[]}
        onAddProofreadingWord={onAdd}
        onIgnoreProofreading={onIgnore}
        onUpdate={() => undefined}
      />,
    );

    await waitFor(() => expect(document.querySelector('.proofreading-issue')).toBeTruthy(), {
      timeout: 2500,
    });
    fireEvent.click(document.querySelector('.proofreading-issue') as HTMLElement);
    expect(await screen.findByText(/疑似重复字/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '忽略此处' }));
    expect(onIgnore).toHaveBeenCalledWith(expect.stringContaining('repeated-char'));

    fireEvent.click(document.querySelector('.proofreading-issue') as HTMLElement);
    fireEvent.click(await screen.findByRole('button', { name: '加入个人词典' }));
    expect(onAdd).toHaveBeenCalledWith('的');
  });

  it('does not decorate when proofreading is disabled', async () => {
    render(
      <EditorPane
        chapter={makeChapter()}
        index={0}
        total={1}
        settings={DEFAULT_SETTINGS}
        appearance={DEFAULT_APPEARANCE}
        focusMode={false}
        proofreadingEnabled={false}
        onUpdate={() => undefined}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(document.querySelector('.proofreading-issue')).toBeNull();
  });
});
