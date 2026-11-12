import { useEffect, useState } from 'react';
import { getBackgroundImage } from './storage';

const objectUrlCache = new Map<string, string>();

export function getCachedBackgroundUrl(imageId: string | null): string | null {
  return imageId ? objectUrlCache.get(imageId) ?? null : null;
}

export function releaseBackgroundUrl(imageId: string | null): void {
  if (!imageId) return;
  const url = objectUrlCache.get(imageId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(imageId);
  }
}

export function useBackgroundImageUrl(imageId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => getCachedBackgroundUrl(imageId));

  useEffect(() => {
    let cancelled = false;
    if (!imageId) {
      setUrl(null);
      return;
    }
    const cached = objectUrlCache.get(imageId);
    if (cached) {
      setUrl(cached);
      return;
    }
    setUrl(null);
    getBackgroundImage(imageId)
      .then((blob) => {
        if (!blob || cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrlCache.set(imageId, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  return url;
}
