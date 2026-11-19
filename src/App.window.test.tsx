import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const windowApi = vi.hoisted(() => ({
  minimize: vi.fn(async () => undefined),
  toggleMaximize: vi.fn(async () => undefined),
  isMaximized: vi.fn(async () => false),
  isFullscreen: vi.fn(async () => false),
  setFullscreen: vi.fn(async () => undefined),
  setAlwaysOnTop: vi.fn(async () => undefined),
  setShadow: vi.fn(async () => undefined),
  outerPosition: vi.fn(async () => ({ x: 40, y: 40 })),
  outerSize: vi.fn(async () => ({ width: 1200, height: 800 })),
  innerSize: vi.fn(async () => ({ width: 1200, height: 800 })),
  setPosition: vi.fn(async () => undefined),
  setSize: vi.fn(async () => undefined),
  setFocus: vi.fn(async () => undefined),
  unmaximize: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
  onResized: vi.fn(async () => () => undefined),
  onDragDropEvent: vi.fn(async () => () => undefined),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => windowApi,
  currentMonitor: vi.fn(async () => ({
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1600, height: 900 },
    },
  })),
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
    windowApi.isMaximized.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(windowApi.isMaximized).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: '最小化窗口' }));
    expect(windowApi.minimize).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '最大化窗口' }));
    await waitFor(() => expect(windowApi.setSize).toHaveBeenCalledWith({ width: 1600, height: 900 }));
    await waitFor(() => expect(windowApi.setPosition).toHaveBeenCalledWith({ x: 0, y: 0 }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '还原窗口' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(windowApi.setShadow).toHaveBeenCalledWith(false));

    await user.click(screen.getByRole('button', { name: '关闭窗口' }));
    expect(windowApi.close).toHaveBeenCalledTimes(1);
  });

  it('toggles native fullscreen with F11', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      configurable: true,
    });
    windowApi.isFullscreen.mockResolvedValue(false);
    render(<App />);
    fireEvent.keyDown(window, { key: 'F11' });
    await waitFor(() => expect(windowApi.setFullscreen).toHaveBeenCalledWith(true));
    await waitFor(() => expect(windowApi.setAlwaysOnTop).toHaveBeenCalledWith(true));
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
