import { useCallback, useEffect, useRef, useState } from 'react';
import {
  currentMonitor,
  getCurrentWindow,
  type PhysicalPosition,
} from '@tauri-apps/api/window';
import { PhysicalSize } from '@tauri-apps/api/dpi';
import {
  closeWindow,
  isTauriEnvironment,
  isWindowFullscreen,
  minimizeWindow,
  toggleFullscreenWindow,
} from '../lib/window';

interface SavedBounds {
  position: PhysicalPosition;
  size: PhysicalSize;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function forceWebViewResize(
  windowApi: ReturnType<typeof getCurrentWindow>,
  size: PhysicalSize,
): Promise<void> {
  await windowApi.setSize(size);
  // WebView2 can keep its old surface after a single programmatic resize,
  // especially while the window is inactive. A one-pixel nudge guarantees a
  // second WM_SIZE without a visible layout jump.
  await wait(50);
  if (size.width > 2) {
    await windowApi.setSize(new PhysicalSize(size.width - 1, size.height));
    await wait(24);
    await windowApi.setSize(size);
  }
  await windowApi.setFocus().catch(() => undefined);
}

export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(isTauriEnvironment);
  const customMaximizedRef = useRef(false);
  const savedBoundsRef = useRef<SavedBounds | null>(null);

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    const windowApi = getCurrentWindow();
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    windowApi
      .isMaximized()
      .then((value) => {
        if (!cancelled) {
          customMaximizedRef.current = false;
          setIsMaximized(value);
        }
      })
      .catch(() => {
        if (!cancelled) setIsDesktop(false);
      });

    void isWindowFullscreen()
      .then((value) => {
        if (!cancelled) setIsFullscreen(value);
      })
      .catch(() => undefined);

    windowApi
      .onResized(() => {
        if (!cancelled && !customMaximizedRef.current) {
          windowApi
            .isMaximized()
            .then((value) => {
              if (!cancelled) setIsMaximized(value);
            })
            .catch(() => undefined);
        }
        void isWindowFullscreen()
          .then((value) => {
            if (!cancelled) setIsFullscreen(value);
            if (!cancelled && !value) {
              void windowApi.setAlwaysOnTop(false).catch(() => undefined);
            }
          })
          .catch(() => undefined);
      })
      .then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const windowApi = getCurrentWindow();
    void windowApi.setShadow(!isMaximized && !isFullscreen).catch(() => undefined);
  }, [isDesktop, isFullscreen, isMaximized]);

  const toggleMaximize = useCallback(async () => {
    const windowApi = getCurrentWindow();

    if (customMaximizedRef.current) {
      customMaximizedRef.current = false;
      const saved = savedBoundsRef.current;
      savedBoundsRef.current = null;
      if (saved) {
        await windowApi.setPosition(saved.position);
        await forceWebViewResize(windowApi, saved.size);
      } else if (await windowApi.isMaximized()) {
        await windowApi.unmaximize();
      }
      setIsMaximized(false);
      return;
    }

    // A native maximized WebView2 window can enter a DWM composition path that
    // stutters while scrolling. Fill the monitor work area with a normal
    // borderless window instead: it looks maximized, keeps the taskbar, but
    // retains the smooth windowed WebView2 path.
    if (await windowApi.isMaximized()) {
      await windowApi.unmaximize();
      setIsMaximized(false);
      return;
    }

    const monitor = await currentMonitor();
    if (!monitor) return;

    savedBoundsRef.current = {
      position: await windowApi.outerPosition(),
      size: await windowApi.innerSize(),
    };
    const [outerSize, innerSize] = await Promise.all([
      windowApi.outerSize(),
      windowApi.innerSize(),
    ]);
    const frameWidth = Math.max(0, outerSize.width - innerSize.width);
    const frameHeight = Math.max(0, outerSize.height - innerSize.height);
    const targetSize = new PhysicalSize(
      Math.max(320, monitor.workArea.size.width - frameWidth),
      Math.max(240, monitor.workArea.size.height - frameHeight),
    );
    customMaximizedRef.current = true;
    await windowApi.setPosition(monitor.workArea.position);
    await forceWebViewResize(windowApi, targetSize);
    await wait(70);
    const actualOuter = await windowApi.outerSize();
    const overflowWidth = Math.max(0, actualOuter.width - monitor.workArea.size.width);
    const overflowHeight = Math.max(0, actualOuter.height - monitor.workArea.size.height);
    if (overflowWidth > 0 || overflowHeight > 0) {
      await forceWebViewResize(
        windowApi,
        new PhysicalSize(
          Math.max(320, targetSize.width - overflowWidth),
          Math.max(240, targetSize.height - overflowHeight),
        ),
      );
    }
    setIsMaximized(true);
  }, []);

  const minimize = useCallback(async () => {
    await minimizeWindow();
  }, []);

  const close = useCallback(async () => {
    await closeWindow();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    await toggleFullscreenWindow();
    setIsFullscreen(await isWindowFullscreen());
  }, []);

  return { isMaximized, isFullscreen, isDesktop, minimize, toggleMaximize, toggleFullscreen, close };
}
