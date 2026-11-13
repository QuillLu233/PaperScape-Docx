import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useWorkspaceDrop(onDropPaths: (paths: string[]) => void) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onDragDropEvent((event) => {
        if (disposed) return;
        if (event.payload.type === 'drop') {
          const paths = event.payload.paths ?? [];
          if (paths.length > 0) onDropPaths(paths);
        }
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [onDropPaths]);
}