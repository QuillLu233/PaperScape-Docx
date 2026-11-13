import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('shows a compact save state and independent document zoom control', async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    render(
      <StatusBar
        chapterIndex={0}
        chapterCount={1}
        characterCount={1234}
        fullCharacterCount={1234}
        savedAt={Date.now()}
        saving={false}
        dirty={false}
        focusMode={false}
        onToggleFocus={vi.fn()}
        standalone
        documentName="文稿.docx"
        zoom={100}
        onZoomChange={onZoomChange}
      />,
    );
    expect(screen.getByText(/已保存/)).toBeInTheDocument();
    expect(screen.getByText(/已保存/).parentElement?.querySelector('svg')).toBeInTheDocument();
    const zoom = screen.getByRole('combobox', { name: '文稿缩放' });
    await user.selectOptions(zoom, '120');
    expect(onZoomChange).toHaveBeenCalledWith(120);
  });
});
