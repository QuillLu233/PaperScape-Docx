import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TitleBar } from './TitleBar';

function renderTitleBar() {
  return render(
    <TitleBar
      projectName="很长的项目名称用于检查省略"
      projectPath="C:\\Users\\writer\\Documents\\很长的项目名称用于检查省略.paperscape"
      leftOpen
      rightOpen
      isMaximized={false}
      focusMode={false}
      menu={<span>menu</span>}
      onToggleLeft={vi.fn()}
      onToggleRight={vi.fn()}
      onToggleFocus={vi.fn()}
      onMinimize={vi.fn()}
      onToggleMaximize={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('TitleBar', () => {
  it('shows the current item at the top and reveals its real path on click', async () => {
    const user = userEvent.setup();
    renderTitleBar();
    const center = screen.getByRole('button', { name: '很长的项目名称用于检查省略' });
    expect(center).toHaveAttribute('title');
    await user.click(center);
    expect(screen.getByRole('dialog', { name: '当前文稿信息' })).toBeInTheDocument();
    expect(screen.getByText(/很长的项目名称用于检查省略\.paperscape/)).toBeInTheDocument();
  });
});
