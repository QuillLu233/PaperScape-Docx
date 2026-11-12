import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  closeWindow,
  isTauriEnvironment,
  isWindowMaximized,
  minimizeWindow,
  toggleMaximizeWindow,
} from '../lib/window';

export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(isTauriEnvironment);

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    const windowApi = getCurrentWindow();
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    windowApi
      .isMaximized()
      .then((value) => {
        if (!cancelled) setIsMaximized(value);
      })
      .catch(() => {
        if (!cancelled) setIsDesktop(false);
      });

    windowApi
      .onResized(() => {
        windowApi
          .isMaximized()
          .then((value) => {
            if (!cancelled) setIsMaximized(value);
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

  const toggleMaximize = useCallback(async () => {
    await toggleMaximizeWindow();
    setIsMaximized(await isWindowMaximized());
  }, []);

  const minimize = useCallback(async () => {
    await minimizeWindow();
  }, []);

  const close = useCallback(async () => {
    await closeWindow();
  }, []);

  return { isMaximized, isDesktop, minimize, toggleMaximize, close };
}
