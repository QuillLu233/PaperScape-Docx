import { useEffect, useState } from 'react';
import { getBackgroundVideo } from './storage';

const objectUrlCache = new Map<string, string>();

export function getCachedVideoUrl(videoId: string | null | undefined): string | null {
  return videoId ? objectUrlCache.get(videoId) ?? null : null;
}

export function registerVideoObjectUrl(videoId: string, url: string): void {
  const previous = objectUrlCache.get(videoId);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  objectUrlCache.set(videoId, url);
}

export function releaseVideoUrl(videoId: string | null | undefined): void {
  if (!videoId) return;
  const url = objectUrlCache.get(videoId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(videoId);
  }
}

export function useBackgroundVideoUrl(videoId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => getCachedVideoUrl(videoId));

  useEffect(() => {
    let cancelled = false;
    if (!videoId) {
      setUrl(null);
      return;
    }
    const cached = objectUrlCache.get(videoId);
    if (cached) {
      setUrl(cached);
      return;
    }
    setUrl(null);
    getBackgroundVideo(videoId)
      .then((blob) => {
        if (!blob || cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrlCache.set(videoId, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return url;
}
