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
      aria-label={media ? `音乐：${media.title || media.sourceName}` : '打开系统音乐控制台'}
      title={
        media
          ? `${media.title || '未知曲目'} · ${media.artist || media.sourceName}`
          : '系统音乐 · 点击查看媒体会话'
      }
      onClick={onToggle}
    >
      <Icon name="music" size={14} />
      {!focusMode && settings.showTitle && media ? (
        <span className="music-mini-title">{media.title || media.sourceName}</span>
      ) : null}
      {!focusMode && settings.showTitle && !media ? (
        <span className="music-mini-title music-mini-empty">系统音乐</span>
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
  onControl: (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous') => void;
  onSeek: (positionMs: number) => void;
  onSelectSession: (sessionId: string) => void;
  onFollowAuto: () => void;
  onRefresh: () => void;
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
  onRefresh,
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
  const compatible = media?.platform === 'windows-legacy';

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
        <div className="music-panel-head-actions">
          <button
            type="button"
            className="music-panel-refresh"
            aria-label="重新检测媒体会话"
            title="重新检测"
            onClick={onRefresh}
          >
            <Icon name="refresh" size={12} />
          </button>
          <button type="button" className="music-panel-close" aria-label="收起音乐控制台" onClick={onClose}>
            <Icon name="close" size={12} />
          </button>
        </div>
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
          aria-label={compatible ? '播放或暂停' : playing ? '暂停' : '播放'}
          disabled={playing ? !media?.canPause : !media?.canPlay}
          onClick={() => onControl(compatible ? 'toggle' : playing ? 'pause' : 'play')}
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
      {compatible ? (
        <p className="music-note">
          兼容模式：仅从网易云窗口标题读取曲名；进度、封面和播放状态可能不可用。控制通过网易云全局快捷键发送（默认 Ctrl+Alt+P / Ctrl+Alt+← / Ctrl+Alt+→）。
        </p>
      ) : null}
      {error ? <p className="music-error">{error}</p> : null}
      {!media && !loading ? (
        <p className="music-note">
          系统媒体接口可用，但未检测到播放会话。请确认播放器正在播放音频，并支持 Windows 系统媒体控制；也可点击右上角刷新。
        </p>
      ) : null}
      <button type="button" className="music-toggle-button" onClick={onToggle}>
        收起音乐控制台
      </button>
    </div>
  );
}
