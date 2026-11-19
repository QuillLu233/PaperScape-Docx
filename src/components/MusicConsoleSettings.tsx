import type { MediaSessionSummary } from '../media/mediaApi';
import type { MediaSettings } from '../media/useSystemMedia';

interface MusicConsoleSettingsProps {
  settings: MediaSettings;
  sessions: MediaSessionSummary[];
  onChange: (patch: Partial<MediaSettings>) => void;
}

export function MusicConsoleSettings({ settings, sessions, onChange }: MusicConsoleSettingsProps) {
  return (
    <details className="settings-section music-settings">
      <summary>
        <span>音乐控制台</span>
        <span className="settings-badge">{settings.enabled ? '已启用' : '已关闭'}</span>
      </summary>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
        <span>启用系统媒体控制</span>
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.showTitle}
          onChange={(event) => onChange({ showTitle: event.target.checked })}
        />
        <span>状态栏显示歌曲名称</span>
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.keepFocusIcon}
          onChange={(event) => onChange({ keepFocusIcon: event.target.checked })}
        />
        <span>专注模式保留音符入口</span>
      </label>
      <label className="range-field">
        <div className="range-meta">
          <span>专注模式入口透明度</span>
          <output>{Math.round(settings.focusIconOpacity * 100)}%</output>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={Math.round(settings.focusIconOpacity * 100)}
          onChange={(event) => onChange({ focusIconOpacity: Number(event.target.value) / 100 })}
        />
      </label>
      <div className="paper-row">
        <label htmlFor="music-follow-mode">媒体来源</label>
        <select
          id="music-follow-mode"
          className="settings-select"
          value={settings.mode}
          onChange={(event) =>
            onChange({ mode: event.target.value === 'fixed' ? 'fixed' : 'auto' })
          }
        >
          <option value="auto">自动跟随系统</option>
          <option value="fixed" disabled={sessions.length === 0}>
            固定播放器
          </option>
        </select>
      </div>
      {settings.mode === 'fixed' ? (
        <div className="paper-row">
          <label htmlFor="music-fixed-session">指定媒体</label>
          <select
            id="music-fixed-session"
            className="settings-select"
            value={settings.fixedSessionId}
            onChange={(event) => onChange({ fixedSessionId: event.target.value })}
          >
            {sessions.length === 0 ? <option value="">暂无会话</option> : null}
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.sourceName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p className="settings-note">关闭后停止媒体监听；外部播放器不受影响。</p>
    </details>
  );
}
