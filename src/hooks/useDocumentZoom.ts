import { useCallback, useEffect, useState } from 'react';

export const DOC_ZOOM_MIN = 50;
export const DOC_ZOOM_MAX = 200;
export const DOC_ZOOM_STEP = 10;
const STORAGE_KEY = 'paperscape.documentZoom';

export function clampDocZoom(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(DOC_ZOOM_MAX, Math.max(DOC_ZOOM_MIN, Math.round(value / DOC_ZOOM_STEP) * DOC_ZOOM_STEP));
}

function initialDocZoom(): number {
  if (typeof window === 'undefined') return 100;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return clampDocZoom(stored || 100);
}

export function useDocumentZoom() {
  const [docZoom, setDocZoomState] = useState(initialDocZoom);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(docZoom));
  }, [docZoom]);

  const setDocZoom = useCallback((value: number) => {
    setDocZoomState(clampDocZoom(value));
  }, []);

  return {
    docZoom,
    setDocZoom,
    zoomIn: () => setDocZoom(docZoom + DOC_ZOOM_STEP),
    zoomOut: () => setDocZoom(docZoom - DOC_ZOOM_STEP),
    resetDocZoom: () => setDocZoom(100),
  };
}
