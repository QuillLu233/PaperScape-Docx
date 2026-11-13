import { getCurrentWindow } from '@tauri-apps/api/window';

export type ResizeEdge =
  | 'East'
  | 'North'
  | 'NorthEast'
  | 'NorthWest'
  | 'South'
  | 'SouthEast'
  | 'SouthWest'
  | 'West';

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

export async function minimizeWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await getCurrentWindow().toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await getCurrentWindow().close();
}

export async function isWindowMaximized(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  return getCurrentWindow().isMaximized();
}

export async function toggleFullscreenWindow(): Promise<void> {
  if (!isTauriEnvironment()) return;
  const windowApi = getCurrentWindow();
  const fullscreen = await windowApi.isFullscreen();
  if (!fullscreen) {
    await windowApi.setFullscreen(true);
    // Windows 11 can leave the shell taskbar above a borderless fullscreen
    // window. Keep this window topmost only for the fullscreen session, then
    // remove it when leaving fullscreen. It is never used for IME layering.
    try {
      await windowApi.setAlwaysOnTop(true);
    } catch {
      // Older WebView2/Tauri builds may not expose this permission; fullscreen
      // still works without it.
    }
  } else {
    try {
      await windowApi.setAlwaysOnTop(false);
    } finally {
      await windowApi.setFullscreen(false);
    }
  }
}

export async function isWindowFullscreen(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  return getCurrentWindow().isFullscreen();
}

export async function startResizeWindow(direction: ResizeEdge): Promise<void> {
  if (!isTauriEnvironment()) return;
  await getCurrentWindow().startResizeDragging(direction);
}
