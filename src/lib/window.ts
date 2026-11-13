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
  await windowApi.setFullscreen(!fullscreen);
}

export async function isWindowFullscreen(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  return getCurrentWindow().isFullscreen();
}

export async function startResizeWindow(direction: ResizeEdge): Promise<void> {
  if (!isTauriEnvironment()) return;
  await getCurrentWindow().startResizeDragging(direction);
}
