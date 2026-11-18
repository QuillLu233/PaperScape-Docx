import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import type {
  BackgroundStyle,
  EnvironmentAnimationSettings,
  EnvironmentDisplaySettings,
  EnvironmentPreset,
  MarginPreset,
  PageSize,
  ProjectAppearance,
  SavedTheme,
  UiColorMode,
  WritingMode,
} from '../types';
import {
  BACKGROUND_PRESETS,
  MARGIN_LABELS,
  PAGE_SIZE_LABELS,
  getPageDimensions,
} from '../appearance/presets';
import { FONT_FAMILIES } from '../editor/editorConfig';
import { Icon } from './Icon';
import { EnvironmentPresetDialog } from './EnvironmentPresetDialog';
import { OFFICIAL_ENVIRONMENTS, environmentThumbnailStyle } from '../appearance/environmentPresets';

interface AppearanceSettingsProps {
  appearance: ProjectAppearance;
  savedThemes: SavedTheme[];
  environmentPresets?: EnvironmentPreset[];
  focusMode: boolean;
  onModeChange: (mode: WritingMode) => void;
  onBackgroundChange: (patch: Partial<BackgroundStyle>) => void;
  onReadingOpacityChange: (value: number) => void;
  onPaperChange: (patch: Partial<ProjectAppearance['paper']>) => void;
  onDisplayChange?: (patch: Partial<EnvironmentDisplaySettings>) => void;
  onAnimationChange?: (patch: Partial<EnvironmentAnimationSettings>) => void;
  onUiColorModeChange?: (mode: UiColorMode) => void;
  onApplyPreset: (presetId: string) => void;
  onApplySavedTheme: (theme: SavedTheme) => void;
  onDeleteSavedTheme: (id: string) => void;
  onSaveTheme: (name: string) => void;
  onApplyEnvironment?: (preset: EnvironmentPreset) => void;
  onSaveEnvironment?: (name: string) => void;
  onRenameEnvironment?: (id: string, name: string) => void;
  onDeleteEnvironment?: (id: string) => void;
  onDuplicateEnvironment?: (preset: EnvironmentPreset) => void;
  onExportEnvironment?: (id: string) => string | null;
  onImportEnvironment?: (text: string) => EnvironmentPreset;
  onRestoreDefaultEnvironment?: () => void;
  onChooseImage: (file: File) => Promise<void>;
  onToggleFocus: () => void;
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field appearance-range">
      <div className="range-meta">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {step < 1 ? value.toFixed(1) : Math.round(value)}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function previewStyle(background: BackgroundStyle): CSSProperties {
  if (background.kind === 'solid') return { backgroundColor: background.color };
  if (background.kind === 'gradient') {
    return {
      backgroundImage: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientMid ?? background.gradientFrom} 52%, ${background.gradientTo})`,
    };
  }
  return {
    background: `linear-gradient(135deg, ${background.color}, ${background.overlayColor})`,
  };
}

export function AppearanceSettings({
  appearance,
  savedThemes,
  environmentPresets = [],
  focusMode,
  onModeChange,
  onBackgroundChange,
  onReadingOpacityChange,
  onPaperChange,
  onDisplayChange,
  onAnimationChange,
  onUiColorModeChange,
  onApplyPreset,
  onApplySavedTheme,
  onDeleteSavedTheme,
  onSaveTheme,
  onApplyEnvironment,
  onSaveEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onDuplicateEnvironment,
  onExportEnvironment,
  onImportEnvironment,
  onRestoreDefaultEnvironment,
  onChooseImage,
  onToggleFocus,
}: AppearanceSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themeName, setThemeName] = useState('');
  const [imageError, setImageError] = useState('');
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(
    () => window.localStorage.getItem('paperscape.settings.advanced.open') === 'true',
  );
  const dimensions = getPageDimensions(appearance.paper);
  const currentEnvironment =
    [...OFFICIAL_ENVIRONMENTS, ...environmentPresets].find(
      (preset) => preset.id === appearance.presetId,
    ) ?? OFFICIAL_ENVIRONMENTS[0];

  useEffect(() => {
    window.localStorage.setItem('paperscape.settings.advanced.open', String(advancedOpen));
  }, [advancedOpen]);

  const onFilePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageError('');
    try {
      await onChooseImage(file);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : '背景图片读取失败');
    }
  };

  return (
    <div className="appearance-settings">
      <section className="settings-section environment-entry-section" aria-labelledby="environment-heading">
        <h3 id="environment-heading" className="settings-label">
          环境预设
        </h3>
        <button
          type="button"
          className="environment-entry"
          onClick={() => setEnvironmentOpen(true)}
          aria-haspopup="dialog"
        >
          <span
            className="environment-entry-thumb"
            style={currentEnvironment ? environmentThumbnailStyle(currentEnvironment) : undefined}
          >
            <span
              className="environment-entry-paper"
              style={{ background: currentEnvironment?.paper.color }}
            />
          </span>
          <span className="environment-entry-copy">
            <strong>{currentEnvironment?.name ?? '原初'}</strong>
            <small>点击切换完整写作环境</small>
          </span>
          <Icon name="chevron-right" size={14} />
        </button>
        <div className="environment-quick-row">
          <label>
            <span>界面配色</span>
            <select
              className="settings-select"
              value={appearance.uiColorMode}
              onChange={(event) =>
                onUiColorModeChange?.(event.target.value as UiColorMode)
              }
            >
              <option value="environment">跟随环境预设</option>
              <option value="light">经典浅色</option>
              <option value="dark">经典深色</option>
              <option value="system">跟随系统</option>
            </select>
          </label>
          <label className="environment-animation-toggle" title="阶段二接入实际动效渲染">
            <input
              type="checkbox"
              checked={appearance.animation.enabled}
              disabled
              onChange={(event) => onAnimationChange?.({ enabled: event.target.checked })}
            />
            <span>环境动效</span>
            <small>阶段二启用</small>
          </label>
        </div>
      </section>

      <EnvironmentPresetDialog
        open={environmentOpen}
        currentId={appearance.presetId}
        presets={environmentPresets}
        onClose={() => setEnvironmentOpen(false)}
        onApply={(preset) => onApplyEnvironment?.(preset)}
        onSaveCurrent={(name) => onSaveEnvironment?.(name)}
        onRename={(id, name) => onRenameEnvironment?.(id, name)}
        onDelete={(id) => onDeleteEnvironment?.(id)}
        onDuplicate={(preset) => onDuplicateEnvironment?.(preset) ?? preset}
        onExport={(id) => onExportEnvironment?.(id) ?? null}
        onImport={(text) => onImportEnvironment?.(text) ?? currentEnvironment}
        onRestoreDefault={() => onRestoreDefaultEnvironment?.()}
      />
      <section className="settings-section" aria-labelledby="writing-mode-heading">
        <h3 id="writing-mode-heading" className="settings-label">
          写作模式
        </h3>
        <div className="writing-mode-grid" role="group" aria-label="写作模式">
          {(
            [
              ['immersive', '沉浸式', '背景铺满窗口'],
              ['paper', '纸张式', '独立纸张页面'],
            ] as const
          ).map(([mode, label, hint]) => (
            <button
              key={mode}
              type="button"
              className={`writing-mode-option${appearance.mode === mode ? ' is-active' : ''}`}
              aria-pressed={appearance.mode === mode}
              onClick={() => onModeChange(mode)}
            >
              <span className="mode-swatch" data-mode={mode} aria-hidden="true" />
              <span className="mode-option-copy">
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="settings-note">切换模式只改变显示，不会修改正文、光标或撤销历史。</p>
        <button type="button" className="focus-entry-button" onClick={onToggleFocus}>
          <Icon name="focus" size={15} />
          <span>{focusMode ? '退出专注写作' : '进入专注写作'}</span>
          <kbd>Ctrl</kbd>
          <kbd>Shift</kbd>
          <kbd>F</kbd>
        </button>
      </section>

      <details
        className="settings-advanced"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>高级设置</summary>
      <section className="settings-section" aria-labelledby="background-heading">
        <div className="settings-label-row">
          <h3 id="background-heading" className="settings-label">
            背景
          </h3>
          <button
            type="button"
            className="text-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="image" size={13} />
            选择图片
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="选择背景图片"
          onChange={(event) => void onFilePicked(event)}
        />
        {imageError ? (
          <p className="appearance-error" role="alert">
            {imageError}
          </p>
        ) : null}
        <p className="appearance-hint">拖入 JPG / PNG / WebP 到编辑窗口也可更换背景。</p>

        <div className="theme-picker" aria-label="背景主题">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`background-tile${
                appearance.background.presetId === preset.id ? ' is-active' : ''
              }`}
              aria-pressed={appearance.background.presetId === preset.id}
              title={preset.name}
              onClick={() => onApplyPreset(preset.id)}
            >
              <span className="background-preview" style={previewStyle(preset.background)} />
              <span>{preset.name}</span>
            </button>
          ))}
          {savedThemes.map((theme) => (
            <span className="saved-theme-tile" key={theme.id}>
              <button
                type="button"
                className={`background-tile${
                  appearance.background.presetId === theme.id ? ' is-active' : ''
                }`}
                aria-pressed={appearance.background.presetId === theme.id}
                title={theme.name}
                onClick={() => onApplySavedTheme(theme)}
              >
                <span className="background-preview" style={previewStyle(theme.background)}>
                  {theme.background.kind === 'image' ? (
                    <Icon name="image" size={12} />
                  ) : null}
                </span>
                <span>{theme.name}</span>
              </button>
              <button
                type="button"
                className="theme-delete"
                aria-label={`删除主题 ${theme.name}`}
                title="删除保存的主题"
                onClick={() => onDeleteSavedTheme(theme.id)}
              >
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>

        <RangeControl
          id="background-brightness"
          label="亮度"
          value={appearance.background.brightness}
          min={40}
          max={140}
          unit="%"
          onChange={(brightness) => onBackgroundChange({ brightness })}
        />
        <RangeControl
          id="background-blur"
          label="模糊"
          value={appearance.background.blur}
          min={0}
          max={24}
          step={1}
          unit="px"
          onChange={(blur) => onBackgroundChange({ blur })}
        />
        <RangeControl
          id="background-vignette"
          label="暗角"
          value={appearance.background.vignette}
          min={0}
          max={100}
          unit="%"
          onChange={(vignette) => onBackgroundChange({ vignette })}
        />
        <RangeControl
          id="background-overlay"
          label="遮罩"
          value={appearance.background.overlay}
          min={0}
          max={80}
          unit="%"
          onChange={(overlay) => onBackgroundChange({ overlay })}
        />
      </section>

      {appearance.mode === 'immersive' ? (
        <section className="settings-section" aria-labelledby="reading-heading">
          <h3 id="reading-heading" className="settings-label">
            阅读区域
          </h3>
          <RangeControl
            id="reading-opacity"
            label="透明度"
            value={appearance.immersive.opacity}
            min={0.2}
            max={1}
            step={0.05}
            onChange={onReadingOpacityChange}
          />
          <RangeControl
            id="immersive-width"
            label="阅读宽度"
            value={appearance.immersive.customWidth}
            min={640}
            max={980}
            step={2}
            unit="px"
            onChange={(customWidth) => onPaperChange({ customWidth: Math.round(customWidth) })}
          />
          <RangeControl
            id="immersive-shadow"
            label="阴影"
            value={appearance.immersive.shadow}
            min={0}
            max={100}
            unit="%"
            onChange={(shadow) => onPaperChange({ shadow })}
          />
          <div className="paper-row">
            <label htmlFor="immersive-margin">页面边距</label>
            <select
              id="immersive-margin"
              className="settings-select"
              value={appearance.immersive.margin}
              onChange={(event) => onPaperChange({ margin: event.target.value as MarginPreset })}
            >
              {(Object.keys(MARGIN_LABELS) as MarginPreset[]).map((margin) => (
                <option key={margin} value={margin}>
                  {MARGIN_LABELS[margin]}
                </option>
              ))}
            </select>
          </div>
          <p className="settings-note">阅读区域叠加在背景上，不改变正文排版。</p>
        </section>
      ) : (
        <section className="settings-section" aria-labelledby="paper-heading">
          <h3 id="paper-heading" className="settings-label">
            纸张
          </h3>
          <div className="paper-row">
            <label htmlFor="page-size">页面</label>
            <select
              id="page-size"
              className="settings-select"
              value={appearance.paper.pageSize}
              onChange={(event) => onPaperChange({ pageSize: event.target.value as PageSize })}
            >
              {(Object.keys(PAGE_SIZE_LABELS) as PageSize[]).map((size) => (
                <option key={size} value={size}>
                  {PAGE_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
            <span className="paper-dimension">
              {dimensions.width} × {dimensions.height}
            </span>
          </div>
          <RangeControl
            id="custom-page-width"
            label="页面宽度"
            value={
              appearance.paper.pageSize === 'custom'
                ? appearance.paper.customWidth
                : dimensions.width
            }
            min={480}
            max={1100}
            step={2}
            unit="px"
            onChange={(customWidth) =>
              onPaperChange({ pageSize: 'custom', customWidth: Math.round(customWidth) })
            }
          />
          <div className="paper-row">
            <label htmlFor="paper-color">纸张颜色</label>
            <input
              id="paper-color"
              className="color-input"
              type="color"
              value={appearance.paper.color}
              onChange={(event) => onPaperChange({ color: event.target.value })}
            />
            <span className="paper-dimension">{appearance.paper.color.toUpperCase()}</span>
          </div>
          <RangeControl
            id="paper-opacity"
            label="透明度"
            value={appearance.paper.opacity}
            min={0.45}
            max={1}
            step={0.05}
            onChange={(opacity) => onPaperChange({ opacity })}
          />
          <RangeControl
            id="paper-shadow"
            label="阴影"
            value={appearance.paper.shadow}
            min={0}
            max={100}
            unit="%"
            onChange={(shadow) => onPaperChange({ shadow })}
          />
          <div className="paper-row">
            <label htmlFor="paper-margin">页边距</label>
            <select
              id="paper-margin"
              className="settings-select"
              value={appearance.paper.margin}
              onChange={(event) => onPaperChange({ margin: event.target.value as MarginPreset })}
            >
              {(Object.keys(MARGIN_LABELS) as MarginPreset[]).map((margin) => (
                <option key={margin} value={margin}>
                  {MARGIN_LABELS[margin]}
                </option>
              ))}
            </select>
          </div>
          {appearance.paper.margin === 'custom' ? (
            <div className="margin-grid">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <label key={side} className="margin-field">
                  <span>{side === 'top' ? '上' : side === 'right' ? '右' : side === 'bottom' ? '下' : '左'}</span>
                  <input
                    type="number"
                    min={16}
                    max={240}
                    value={appearance.paper.customMargins[side]}
                    onChange={(event) =>
                      onPaperChange({
                        customMargins: {
                          ...appearance.paper.customMargins,
                          [side]: Number(event.target.value),
                        },
                      })
                    }
                  />
                  <span>px</span>
                </label>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <section className="settings-section" aria-labelledby="display-heading">
        <h3 id="display-heading" className="settings-label">文字显示</h3>
        <div className="paper-row">
          <label htmlFor="display-color-mode">显示颜色</label>
          <select
            id="display-color-mode"
            className="settings-select"
            value={appearance.display.colorMode}
            onChange={(event) =>
              onDisplayChange?.({
                colorMode: event.target.value as EnvironmentDisplaySettings['colorMode'],
              })
            }
          >
            <option value="auto">自动适配</option>
            <option value="dark">深色文字</option>
            <option value="light">浅色文字</option>
            <option value="custom">自定义颜色</option>
          </select>
        </div>
        {appearance.display.colorMode === 'custom' ? (
          <div className="paper-row">
            <label htmlFor="display-custom-color">自定义颜色</label>
            <input
              id="display-custom-color"
              className="color-input"
              type="color"
              value={appearance.display.color}
              onChange={(event) => onDisplayChange?.({ color: event.target.value })}
            />
            <span className="paper-dimension">{appearance.display.color.toUpperCase()}</span>
          </div>
        ) : null}
        <div className="paper-row">
          <label htmlFor="display-font">显示字体</label>
          <select
            id="display-font"
            className="settings-select"
            value={appearance.display.fontFamily}
            onChange={(event) => onDisplayChange?.({ fontFamily: event.target.value })}
          >
            <option value="">跟随编辑器</option>
            {FONT_FAMILIES.filter((font) => font.value).map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <p className="settings-note">只改变写作视图，不修改 DOCX 中的字体、字号或颜色。</p>
      </section>

      <section className="settings-section" aria-labelledby="animation-heading">
        <div className="settings-label-row">
          <h3 id="animation-heading" className="settings-label">环境动效</h3>
          <span className="settings-badge">阶段二</span>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={appearance.animation.enabled}
            onChange={(event) => onAnimationChange?.({ enabled: event.target.checked })}
          />
          <span>启用环境动效</span>
        </label>
        <div className="paper-row">
          <label htmlFor="animation-type">动效类型</label>
          <select
            id="animation-type"
            className="settings-select"
            value={appearance.animation.type}
            onChange={(event) => onAnimationChange?.({ type: event.target.value })}
          >
            <option value="none">无</option>
            <option value="rain">雨</option>
            <option value="snow">雪</option>
            <option value="fireflies">萤火</option>
            <option value="dust">微尘</option>
          </select>
        </div>
        <RangeControl
          id="animation-speed"
          label="速度"
          value={appearance.animation.speed}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(speed) => onAnimationChange?.({ speed })}
        />
        <RangeControl
          id="animation-intensity"
          label="强度"
          value={appearance.animation.intensity}
          min={0}
          max={1}
          step={0.05}
          onChange={(intensity) => onAnimationChange?.({ intensity })}
        />
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={appearance.animation.lowPower}
            onChange={(event) => onAnimationChange?.({ lowPower: event.target.checked })}
          />
          <span>低功耗模式</span>
        </label>
      </section>

      <section className="settings-section" aria-labelledby="saved-theme-heading">
        <h3 id="saved-theme-heading" className="settings-label">
          自定义主题
        </h3>
        <div className="save-theme-row">
          <input
            className="settings-text-input"
            aria-label="主题名称"
            placeholder="主题名称"
            value={themeName}
            maxLength={24}
            onChange={(event) => setThemeName(event.target.value)}
          />
          <button
            type="button"
            className="save-theme-button"
            onClick={() => {
              onSaveTheme(themeName);
              setThemeName('');
            }}
          >
            保存当前
          </button>
        </div>
        <p className="settings-note">保存会记录当前背景、沉浸式透明度和纸张设置；主题按项目独立应用。</p>
      </section>
      </details>
    </div>
  );
}
