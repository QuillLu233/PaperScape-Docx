import { memo } from 'react';
import type {
  BackgroundStyle,
  EnvironmentDisplaySettings,
  EnvironmentPreset,
  ProjectAppearance,
  SavedTheme,
  ThemeMode,
  UiColorMode,
  WritingMode,
  WritingSettings,
  SaveMode,
} from '../types';
import { DEFAULT_SETTINGS, EDITOR_WIDTH_MAX, EDITOR_WIDTH_MIN, THEME_LABELS } from '../types';
import { AppearanceSettings } from './AppearanceSettings';
import { MusicConsoleSettings } from './MusicConsoleSettings';
import type { MediaSessionSummary } from '../media/mediaApi';
import type { MediaSettings } from '../media/useSystemMedia';
import { Icon, type IconName } from './Icon';

interface SettingsPanelProps {
  open: boolean;
  theme: ThemeMode;
  settings: WritingSettings;
  appearance: ProjectAppearance;
  savedThemes: SavedTheme[];
  environmentPresets?: EnvironmentPreset[];
  focusMode: boolean;
  onThemeChange: (mode: ThemeMode) => void;
  onUiColorModeChange?: (mode: UiColorMode) => void;
  onDisplayChange?: (patch: Partial<EnvironmentDisplaySettings>) => void;
  onApplyEnvironment?: (preset: EnvironmentPreset) => void;
  onSaveEnvironment?: (name: string) => void;
  onRenameEnvironment?: (id: string, name: string) => void;
  onDeleteEnvironment?: (id: string) => void;
  onDuplicateEnvironment?: (preset: EnvironmentPreset) => void;
  onExportEnvironment?: (id: string) => string | null;
  onImportEnvironment?: (text: string) => EnvironmentPreset;
  onRestoreDefaultEnvironment?: () => void;
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
  defaultDocumentsDir: string;
  onChooseDefaultDocumentsDir: () => void;
  uiZoom: number;
  onUiZoomChange: (value: number) => void;
  openLastSession: boolean;
  onOpenLastSessionChange: (value: boolean) => void;
  onManageFonts: () => void;
  proofreadingEnabled: boolean;
  proofreadingDictionaryCount: number;
  proofreadingIgnoredCount: number;
  onProofreadingEnabledChange: (value: boolean) => void;
  onClearProofreadingDictionary: () => void;
  onClearProofreadingIgnored: () => void;
  onToggleFocus: () => void;
  onClose: () => void;
  documentMode?: boolean;
  saveMode: SaveMode;
  onSaveModeChange: (mode: SaveMode) => void;
  documentBarAutoCollapse: boolean;
  onDocumentBarAutoCollapseChange: (value: boolean) => void;
  mediaSettings?: MediaSettings;
  mediaSessions?: MediaSessionSummary[];
  onMediaSettingsChange?: (patch: Partial<MediaSettings>) => void;
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
  environmentPresets = [],
  focusMode,
  onThemeChange,
  onUiColorModeChange,
  onDisplayChange,
  onApplyEnvironment,
  onSaveEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onDuplicateEnvironment,
  onExportEnvironment,
  onImportEnvironment,
  onRestoreDefaultEnvironment,
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
  defaultDocumentsDir,
  onChooseDefaultDocumentsDir,
  uiZoom,
  onUiZoomChange,
  openLastSession,
  onOpenLastSessionChange,
  onManageFonts,
  proofreadingEnabled,
  proofreadingDictionaryCount,
  proofreadingIgnoredCount,
  onProofreadingEnabledChange,
  onClearProofreadingDictionary,
  onClearProofreadingIgnored,
  onToggleFocus,
  onClose,
  documentMode = false,
  mediaSettings,
  mediaSessions = [],
  onMediaSettingsChange,
  saveMode,
  onSaveModeChange,
  documentBarAutoCollapse,
  onDocumentBarAutoCollapseChange,
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
        {documentMode ? (
          <section className="settings-section" aria-labelledby="document-settings-heading">
            <h3 id="document-settings-heading" className="settings-label">
              文件模式
            </h3>
            <p className="settings-note">
              当前直接编辑磁盘上的 DOCX。背景、纸张和写作模式可单独设置并保存在本机，不写入 DOCX；详情见下方“背景”和“纸张”。
            </p>
          </section>
        ) : null}

        <section className="settings-section" aria-labelledby="save-mode-heading">
          <h3 id="save-mode-heading" className="settings-label">
            保存方式
          </h3>
          <div className="save-mode-grid" role="group" aria-label="保存方式">
            <button
              type="button"
              className={`theme-option${saveMode === 'auto' ? ' is-active' : ''}`}
              aria-pressed={saveMode === 'auto'}
              onClick={() => onSaveModeChange('auto')}
            >
              <Icon name="save" size={17} />
              <span>自动保存</span>
            </button>
            <button
              type="button"
              className={`theme-option${saveMode === 'manual' ? ' is-active' : ''}`}
              aria-pressed={saveMode === 'manual'}
              onClick={() => onSaveModeChange('manual')}
            >
              <Icon name="edit" size={17} />
              <span>手动保存</span>
            </button>
          </div>
          <p className="settings-note">
            {saveMode === 'auto'
              ? documentMode
                ? '停止编辑约 1.5 秒后自动写回 DOCX；只读、格式风险或外部修改时不会自动覆盖。'
                : '停止编辑后自动保存当前项目章节。'
              : documentMode
                ? '使用 Ctrl+S、文件菜单或保存按钮保存 DOCX；不会自动写回原文件。'
                : '使用 Ctrl+S 或文件菜单保存当前项目。'}
          </p>
          {documentMode ? (
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={documentBarAutoCollapse}
                onChange={(event) => onDocumentBarAutoCollapseChange(event.target.checked)}
              />
              <span>文稿信息栏空闲后自动收起</span>
            </label>
          ) : null}
        </section>

        <AppearanceSettings
          appearance={appearance}
          savedThemes={savedThemes}
          environmentPresets={environmentPresets}
          focusMode={focusMode}
          onModeChange={onModeChange}
          onBackgroundChange={onBackgroundChange}
          onReadingOpacityChange={onReadingOpacityChange}
          onPaperChange={onPaperChange}
          onDisplayChange={onDisplayChange}
          onUiColorModeChange={onUiColorModeChange}
          onApplyPreset={onApplyPreset}
          onApplySavedTheme={onApplySavedTheme}
          onDeleteSavedTheme={onDeleteSavedTheme}
          onSaveTheme={onSaveTheme}
          onApplyEnvironment={onApplyEnvironment}
          onSaveEnvironment={onSaveEnvironment}
          onRenameEnvironment={onRenameEnvironment}
          onDeleteEnvironment={onDeleteEnvironment}
          onDuplicateEnvironment={onDuplicateEnvironment}
          onExportEnvironment={onExportEnvironment}
          onImportEnvironment={onImportEnvironment}
          onRestoreDefaultEnvironment={onRestoreDefaultEnvironment}
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

        {!documentMode ? (
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
        ) : null}

        <section className="settings-section" aria-labelledby="interface-heading">
          <h3 id="interface-heading" className="settings-label">
            界面
          </h3>
          <label className="settings-select-row">
            <span>界面缩放</span>
            <select
              aria-label="界面缩放"
              value={uiZoom}
              onChange={(event) => onUiZoomChange(Number(event.target.value))}
            >
              {[100, 110, 125, 150].map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
          </label>
          <label className="settings-check-row">
            <input
              type="checkbox"
              checked={openLastSession}
              onChange={(event) => onOpenLastSessionChange(event.target.checked)}
            />
            <span>启动时打开上次项目或文件夹</span>
          </label>
          <button type="button" className="secondary-button font-manager-entry" onClick={onManageFonts}>
            字体管理…
          </button>
        </section>

        <section className="settings-section" aria-labelledby="proofreading-heading">
          <h3 id="proofreading-heading" className="settings-label">
            中文校对
          </h3>
          <label className="settings-check-row">
            <input
              type="checkbox"
              checked={proofreadingEnabled}
              onChange={(event) => onProofreadingEnabledChange(event.target.checked)}
            />
            <span>启用离线中文校对</span>
          </label>
          <p className="settings-note">
            仅检查重复字词、连续标点、括号引号配对、中英文标点混用和多余空格；只检查当前段落，不联网、不自动修改正文。
          </p>
          <div className="settings-proofreading-stats">
            <span>个人词典 {proofreadingDictionaryCount} 项</span>
            <button
              type="button"
              className="secondary-button"
              disabled={proofreadingDictionaryCount === 0}
              onClick={onClearProofreadingDictionary}
            >
              清空
            </button>
          </div>
          <div className="settings-proofreading-stats">
            <span>已忽略 {proofreadingIgnoredCount} 处</span>
            <button
              type="button"
              className="secondary-button"
              disabled={proofreadingIgnoredCount === 0}
              onClick={onClearProofreadingIgnored}
            >
              清空
            </button>
          </div>
        </section>

        {mediaSettings && onMediaSettingsChange ? (
          <MusicConsoleSettings
            settings={mediaSettings}
            sessions={mediaSessions}
            onChange={onMediaSettingsChange}
          />
        ) : null}

        <section className="settings-section" aria-labelledby="data-heading">
          <h3 id="data-heading" className="settings-label">
            本地存储
          </h3>
          <div className="storage-card">
            <span className="status-dot" aria-hidden="true" />
            <div>
              {documentMode ? (
                <>
                  <p>DOCX 保存在你选择的位置</p>
                  <p className="storage-detail">应用不会把正文强制移入 AppData；配置和缓存属于本机应用数据。</p>
                </>
              ) : (
                <>
                  <p>章节与本项目偏好保存在项目文件夹</p>
                  <p className="storage-detail">正文是独立的 Tiptap JSON 章节文件；背景图片使用本机 IndexedDB 缓存。</p>
                </>
              )}
            </div>
          </div>
          <div className="default-docs-field">
            <div>
              <p>默认文稿目录</p>
              <p className="storage-detail" title={defaultDocumentsDir}>
                {defaultDocumentsDir || '正在读取…'}
              </p>
            </div>
            <button type="button" className="secondary-button" onClick={onChooseDefaultDocumentsDir}>
              更改…
            </button>
          </div>
        </section>

        <div className="settings-version">
          <span>2.0.0-dev.4</span>
          <span>正式版</span>
        </div>
      </div>
    </aside>
  );
});
