import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mediaAvailable,
  mediaControl,
  mediaSeek,
  mediaSessions,
  mediaState,
  type MediaSessionSummary,
  type MediaState,
} from './mediaApi';

export interface MediaSettings {
  enabled: boolean;
  showTitle: boolean;
  keepFocusIcon: boolean;
  focusIconOpacity: number;
  mode: 'auto' | 'fixed';
  fixedSessionId: string;
}

const SETTINGS_KEY = 'paperscape.media.settings';
export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  enabled: true,
  showTitle: true,
  keepFocusIcon: true,
  focusIconOpacity: 0.6,
  mode: 'auto',
  fixedSessionId: '',
};

function loadSettings(): MediaSettings {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return DEFAULT_MEDIA_SETTINGS;
    return {
      enabled: parsed.enabled !== false,
      showTitle: parsed.showTitle !== false,
      keepFocusIcon: parsed.keepFocusIcon !== false,
      focusIconOpacity:
        typeof parsed.focusIconOpacity === 'number'
          ? Math.min(1, Math.max(0.2, parsed.focusIconOpacity))
          : DEFAULT_MEDIA_SETTINGS.focusIconOpacity,
      mode: parsed.mode === 'fixed' ? 'fixed' : 'auto',
      fixedSessionId: typeof parsed.fixedSessionId === 'string' ? parsed.fixedSessionId : '',
    };
  } catch {
    return DEFAULT_MEDIA_SETTINGS;
  }
}

export function useSystemMedia(panelOpen: boolean) {
  const [settings, setSettings] = useState<MediaSettings>(loadSettings);
  const [available, setAvailable] = useState(false);
  const [sessions, setSessions] = useState<MediaSessionSummary[]>([]);
  const [media, setMedia] = useState<MediaState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const refreshInFlight = useRef(false);
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
  const lastSignatureRef = useRef('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const refresh = useCallback(async () => {
    if (!settingsRef.current.enabled) {
      setAvailable(false);
      setSessions([]);
      setMedia(null);
      lastSignatureRef.current = 'disabled';
      return;
    }
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const nextAvailable = await mediaAvailable();
      if (!nextAvailable) {
        const signature = 'unsupported';
        if (signature !== lastSignatureRef.current) {
          lastSignatureRef.current = signature;
          setAvailable(false);
          setSessions([]);
          setMedia(null);
          setError('当前系统或平台不支持媒体控制');
        }
        return;
      }
      const nextSessions = await mediaSessions();
      const current = settingsRef.current;
      const fixedExists = nextSessions.some((session) => session.id === current.fixedSessionId);
      const target =
        current.mode === 'fixed' && fixedExists
          ? current.fixedSessionId
          : nextSessions.find((session) => session.isCurrent)?.id ?? nextSessions[0]?.id;
      const nextMedia = target ? await mediaState(target) : null;
      const signature = JSON.stringify({
        available: nextAvailable,
        sessions: nextSessions.map((session) => [
          session.id,
          session.title,
          session.artist,
          session.status,
          session.isCurrent,
        ]),
        media: nextMedia
          ? [
              nextMedia.sessionId,
              nextMedia.title,
              nextMedia.artist,
              nextMedia.album,
              nextMedia.status,
              nextMedia.durationMs,
              nextMedia.cover.length,
              panelOpenRef.current ? nextMedia.positionMs : 0,
            ]
          : null,
      });
      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        setAvailable(true);
        setSessions(nextSessions);
        setMedia(nextMedia);
        setError('');
      }
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : '读取系统媒体失败';
      setError((current) => (current === message ? current : message));
    } finally {
      hasLoadedRef.current = true;
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!settings.enabled) {
      setAvailable(false);
      setSessions([]);
      setMedia(null);
      return;
    }
    void refresh();
    const interval = window.setInterval(
      () => void refresh(),
      panelOpen ? 1000 : 3000,
    );
    return () => window.clearInterval(interval);
  }, [panelOpen, refresh, settings.enabled, settings.fixedSessionId, settings.mode]);

  const updateSettings = useCallback((patch: Partial<MediaSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setSettings((current) => ({
      ...current,
      mode: 'fixed',
      fixedSessionId: sessionId,
    }));
  }, []);

  const followAuto = useCallback(() => {
    setSettings((current) => ({ ...current, mode: 'auto', fixedSessionId: '' }));
  }, []);

  const control = useCallback(
    async (action: 'play' | 'pause' | 'next' | 'previous') => {
      if (!media?.sessionId) return;
      try {
        await mediaControl(media.sessionId, action);
        window.setTimeout(() => void refresh(), 250);
      } catch (controlError) {
        setError(controlError instanceof Error ? controlError.message : '媒体操作失败');
      }
    },
    [media?.sessionId, refresh],
  );

  const seek = useCallback(
    async (positionMs: number) => {
      if (!media?.sessionId) return;
      try {
        await mediaSeek(media.sessionId, Math.round(positionMs));
        window.setTimeout(() => void refresh(), 250);
      } catch (seekError) {
        setError(seekError instanceof Error ? seekError.message : '进度调整失败');
      }
    },
    [media?.sessionId, refresh],
  );

  return {
    settings,
    updateSettings,
    available,
    sessions,
    media,
    error,
    loading,
    refresh,
    selectSession,
    followAuto,
    control,
    seek,
  };
}
