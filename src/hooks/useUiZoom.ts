import { useCallback, useEffect, useState } from 'react';

export const UI_ZOOM_LEVELS = [100, 110, 125, 150] as const;
export type UiZoom = (typeof UI_ZOOM_LEVELS)[number];

const STORAGE_KEY = 'paperscape.uiZoom';

function initialUiZoom(): UiZoom {
  if (typeof window === 'undefined') return 110;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return UI_ZOOM_LEVELS.includes(stored as UiZoom) ? (stored as UiZoom) : 110;
}

export function useUiZoom() {
  const [uiZoom, setUiZoomState] = useState<UiZoom>(initialUiZoom);

  useEffect(() => {
    const scale = uiZoom / 100;
    document.documentElement.style.setProperty('--ui-scale', String(scale));
    window.localStorage.setItem(STORAGE_KEY, String(uiZoom));
  }, [uiZoom]);

  const setUiZoom = useCallback((value: number) => {
    if (UI_ZOOM_LEVELS.includes(value as UiZoom)) setUiZoomState(value as UiZoom);
  }, []);

  return { uiZoom, setUiZoom };
}
