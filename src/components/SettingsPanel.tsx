import { memo } from 'react';
import type {
  BackgroundStyle,
  ProjectAppearance,
  SavedTheme,
  ThemeMode,
  WritingMode,
  WritingSettings,
} from '../types';
import { DEFAULT_SETTINGS, EDITOR_WIDTH_MAX, EDITOR_WIDTH_MIN, THEME_LABELS } from '../types';
import { AppearanceSettings } from './AppearanceSettings';
import { Icon, type IconName } from './Icon';

interface SettingsPanelProps {
  open: boolean;
  theme: ThemeMode;
  settings: WritingSettings;
  appearance: ProjectAppearance;
  savedThemes: SavedTheme[];
  focusMode: boolean;
  onThemeChange: (mode: ThemeMode) => void;
  onSettingsChange: (patch: Partial<WritingSettings>) => void;
  onModeChange: (mode: WritingMode) => void;
  onBackgroundChange: (patch: Partial<BackgroundStyle>) => void;
  onReadingOpacityChange: (value: number) => void;
  onPaperChange: (patch: Partial<ProjectAppearance['paper']>) => void;
  onApplyPreset: (presetId: string) => void;
  onApplySavedTheme: (theme: SavedTheme) => void;
  onDeleteSavedTheme: (id: string) => void;
  onSaveTheme: (name: string) => void;
  onChooseImage: (file: File) => Promise<void>;
  onToggleFocus: () => void;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{ mode: ThemeMode; icon: IconName }> = [
  { mode: 'light', icon: 'sun' },
  { mode: 'dark', icon: 'moon' },
  { mode: 'system', icon: 'monitor' },
];

export const SettingsPanel = memo(function SettingsPanel({
  open,
  theme,
  settings,
  appearance,
  savedThemes,
  focusMode,
  onThemeChange,
  onSettingsChange,
  onModeChange,
  onBackgroundChange,
  onReadingOpacityChange,
  onPaperChange,
  onApplyPreset,
  onApplySavedTheme,
  onDeleteSavedTheme,
  onSaveTheme,
  onChooseImage,
  onToggleFocus,
  onClose,
}: SettingsPanelProps) {
  return (
    <aside
      className={`settings-panel panel${open ? '' : ' is-collapsed'}`}
      aria-label="设置"
      aria-hidden={!open}
      data-testid="settings-panel"
      data-open={open}
    >
      <div className="panel-heading">
        <div>
          <p className="panel-kicker">PREFERENCES</p>
          <h2 className="panel-title">设置</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="收起设置面板"
          title="收起设置面板 (Ctrl+Shift+B)"
          onClick={onClose}
        >
          <Icon name="panel-right" size={16} />
        </button>
      </div>

      <div className="settings-scroll">
        <AppearanceSettings
          appearance={appearance}
          savedThemes={savedThemes}
          focusMode={focusMode}
          onModeChange={onModeChange}
          onBackgroundChange={onBackgroundChange}
          onReadingOpacityChange={onReadingOpacityChange}
          onPaperChange={onPaperChange}
          onApplyPreset={onApplyPreset}
          onApplySavedTheme={onApplySavedTheme}
          onDeleteSavedTheme={onDeleteSavedTheme}
          onSaveTheme={onSaveTheme}
          onChooseImage={onChooseImage}
          onToggleFocus={onToggleFocus}
        />

        <section className="settings-section" aria-labelledby="theme-heading">
          <h3 id="theme-heading" className="settings-label">
            外观主题
          </h3>
          <div className="theme-grid" role="group" aria-label="外观主题">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                className={`theme-option${theme === option.mode ? ' is-active' : ''}`}
                aria-pressed={theme === option.mode}
                onClick={() => onThemeChange(option.mode)}
              >
                <Icon name={option.icon} size={17} />
                <span>{THEME_LABELS[option.mode]}</span>
              </button>
            ))}
          </div>
          <p className="settings-note">界面会保持安静的暖纸色，深色模式同样低对比。</p>
        </section>

        <section className="settings-section" aria-labelledby="typography-heading">
          <div className="settings-label-row">
            <h3 id="typography-heading" className="settings-label">
              正文排版
            </h3>
            <button
              type="button"
              className="text-button"
              onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
            >
              <Icon name="reset" size={13} />
              恢复默认
            </button>
          </div>

          <div className="range-field">
            <div className="range-meta">
              <label htmlFor="font-size">字号</label>
              <output htmlFor="font-size">{settings.fontSize} px</output>
            </div>
            <input
              id="font-size"
              type="range"
              min={14}
              max={24}
              step={1}
              value={settings.fontSize}
              onChange={(event) => onSettingsChange({ fontSize: Number(event.target.value) })}
            />
          </div>

          <div className="range-field">
            <div className="range-meta">
              <label htmlFor="line-height">行距</label>
              <output htmlFor="line-height">{settings.lineHeight.toFixed(1)}</output>
            </div>
            <input
              id="line-height"
              type="range"
              min={1.4}
              max={2.4}
              step={0.1}
              value={settings.lineHeight}
              onChange={(event) => onSettingsChange({ lineHeight: Number(event.target.value) })}
            />
          </div>

          <div className="range-field">
            <div className="range-meta">
              <label htmlFor="editor-width">沉浸式阅读宽度</label>
              <output htmlFor="editor-width">{settings.editorWidth} px</output>
            </div>
            <input
              id="editor-width"
              type="range"
              min={EDITOR_WIDTH_MIN}
              max={EDITOR_WIDTH_MAX}
              step={10}
              value={settings.editorWidth}
              onChange={(event) => onSettingsChange({ editorWidth: Number(event.target.value) })}
            />
          </div>

          <div
            className="type-preview"
            style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}
          >
            让文字慢下来。
          </div>
        </section>

        <section className="settings-section" aria-labelledby="data-heading">
          <h3 id="data-heading" className="settings-label">
            本地存储
          </h3>
          <div className="storage-card">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <p>章节与本项目偏好保存在项目文件夹</p>
              <p className="storage-detail">正文是独立的 Tiptap JSON 章节文件；背景图片使用本机 IndexedDB 缓存。</p>
            </div>
          </div>
        </section>

        <div className="settings-version">
          <span>PaperScape 1.0.0</span>
          <span>正式版</span>
        </div>
      </div>
    </aside>
  );
});
