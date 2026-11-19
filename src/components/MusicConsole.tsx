import { useEffect, useRef, type CSSProperties } from 'react';
import { Icon } from './Icon';
import type { MediaSessionSummary, MediaState } from '../media/mediaApi';
import type { MediaSettings } from '../media/useSystemMedia';

function formatTime(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface MusicMiniProps {
  media: MediaState | null;
  available: boolean;
  settings: MediaSettings;
  focusMode: boolean;
  onToggle: () => void;
}

export function MusicMini({ media, available, settings, focusMode, onToggle }: MusicMiniProps) {
  if (!settings.enabled || !available) return null;
  if (focusMode && !settings.keepFocusIcon) return null;
  return (
    <button
      type="button"
      className={`music-mini${focusMode ? ' is-focus' : ''}${media ? ' has-media' : ''}`}
      style={
        focusMode
          ? ({ '--music-opacity': settings.focusIconOpacity } as CSSProperties)
          : undefined
      }
      aria-label={media ? `音乐：${media.title || media.sourceName}` : '系统音乐'}
      title={media ? `${media.title || '未知曲目'} · ${media.artist || media.sourceName}` : '系统音乐'}
      onClick={onToggle}
    >
      <Icon name="music" size={14} />
      {!focusMode && settings.showTitle && media ? (
        <span className="music-mini-title">{media.title || media.sourceName}</span>
      ) : null}
      {media ? (
        <span className={`music-mini-state state-${media.status}`} aria-hidden="true">
          {media.status === 'playing' ? '▶' : media.status === 'paused' ? 'Ⅱ' : '·'}
        </span>
      ) : null}
    </button>
  );
}

interface MusicPanelProps {
  open: boolean;
  focusMode: boolean;
  media: MediaState | null;
  sessions: MediaSessionSummary[];
  settings: MediaSettings;
  error: string;
  loading: boolean;
  onClose: () => void;
  onToggle: () => void;
  onControl: (action: 'play' | 'pause' | 'next' | 'previous') => void;
  onSeek: (positionMs: number) => void;
  onSelectSession: (sessionId: string) => void;
  onFollowAuto: () => void;
}

export function MusicPanel({
  open,
  focusMode,
  media,
  sessions,
  settings,
  error,
  loading,
  onClose,
  onToggle,
  onControl,
  onSeek,
  onSelectSession,
  onFollowAuto,
}: MusicPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const pointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.('.music-mini')) return;
      onClose();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) onClose();
    };
    document.addEventListener('pointerdown', pointerDown);
    document.addEventListener('keydown', keyDown);
    return () => {
      document.removeEventListener('pointerdown', pointerDown);
      document.removeEventListener('keydown', keyDown);
    };
  }, [onClose, open]);

  if (!open || !settings.enabled) return null;

  const duration = Math.max(media?.durationMs ?? 0, 1);
  const position = Math.min(media?.positionMs ?? 0, duration);
  const playing = media?.status === 'playing';

  return (
    <div
      ref={panelRef}
      className={`music-panel${focusMode ? ' is-focus' : ''}`}
      role="dialog"
      aria-label="音乐控制台"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="music-panel-header">
        <span className="music-panel-kicker">NOW PLAYING</span>
        <button type="button" className="music-panel-close" aria-label="收起音乐控制台" onClick={onClose}>
          <Icon name="close" size={12} />
        </button>
      </div>

      <div className="music-track">
        {media?.cover ? (
          <img className="music-cover" src={media.cover} alt="" />
        ) : (
          <span className="music-cover music-cover-empty">
            <Icon name="music" size={22} />
          </span>
        )}
        <div className="music-track-copy">
          <strong title={media?.title}>{media?.title || (loading ? '正在读取…' : '暂无媒体会话')}</strong>
          <span title={media?.artist}>{media?.artist || '未提供歌手信息'}</span>
          <small>
            {[media?.album, media?.sourceName].filter(Boolean).join(' · ') || '外部播放器'}
          </small>
        </div>
      </div>

      <div className="music-progress">
        <span>{formatTime(position)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={1000}
          value={position}
          disabled={!media?.canSeek || duration <= 1}
          aria-label="播放进度"
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <span>{formatTime(media?.durationMs ?? 0)}</span>
      </div>

      <div className="music-controls">
        <button
          type="button"
          className="music-control"
          aria-label="上一首"
          disabled={!media?.canPrevious}
          onClick={() => onControl('previous')}
        >
          <Icon name="previous" size={16} />
        </button>
        <button
          type="button"
          className="music-control music-play"
          aria-label={playing ? '暂停' : '播放'}
          disabled={playing ? !media?.canPause : !media?.canPlay}
          onClick={() => onControl(playing ? 'pause' : 'play')}
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
        </button>
        <button
          type="button"
          className="music-control"
          aria-label="下一首"
          disabled={!media?.canNext}
          onClick={() => onControl('next')}
        >
          <Icon name="next" size={16} />
        </button>
      </div>

      <div className="music-source-row">
        <label htmlFor="music-source">媒体来源</label>
        <select
          id="music-source"
          className="settings-select"
          value={settings.mode === 'auto' ? '__auto__' : settings.fixedSessionId}
          onChange={(event) => {
            if (event.target.value === '__auto__') onFollowAuto();
            else onSelectSession(event.target.value);
          }}
        >
          <option value="__auto__">自动跟随系统</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.sourceName}
              {session.title ? ` · ${session.title}` : ''}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="music-error">{error}</p> : null}
      {!media && !loading ? <p className="music-note">打开外部播放器播放音乐后，这里会自动显示。</p> : null}
      <button type="button" className="music-toggle-button" onClick={onToggle}>
        收起音乐控制台
      </button>
    </div>
  );
}
