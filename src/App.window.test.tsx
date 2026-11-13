import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const windowApi = vi.hoisted(() => ({
  minimize: vi.fn(async () => undefined),
  toggleMaximize: vi.fn(async () => undefined),
  isMaximized: vi.fn(async () => false),
  close: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
  onResized: vi.fn(async () => () => undefined),
  onDragDropEvent: vi.fn(async () => () => undefined),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => windowApi,
}));

describe('desktop window controls', () => {
  beforeEach(() => {
    windowApi.isMaximized.mockReset();
    windowApi.isMaximized.mockResolvedValue(false);
  });

  afterEach(() => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    vi.clearAllMocks();
  });

  it('calls the Tauri window API for minimize, maximize, restore and close', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      configurable: true,
    });
    windowApi.isMaximized.mockResolvedValueOnce(false).mockResolvedValue(true);
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(windowApi.isMaximized).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: '最小化窗口' }));
    expect(windowApi.minimize).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '最大化窗口' }));
    expect(windowApi.toggleMaximize).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '还原窗口' })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: '关闭窗口' }));
    expect(windowApi.close).toHaveBeenCalledTimes(1);
  });

  it('starts native resize dragging from the eight transparent handles', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      configurable: true,
    });
    render(<App />);
    await waitFor(() => expect(windowApi.isMaximized).toHaveBeenCalled());

    const southEast = document.querySelector('.resize-se');
    expect(southEast).not.toBeNull();
    fireEvent.pointerDown(southEast!, { button: 0 });
    expect(windowApi.startResizeDragging).toHaveBeenCalledWith('SouthEast');
  });
});
