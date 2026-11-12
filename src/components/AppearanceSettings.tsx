import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import type {
  BackgroundStyle,
  MarginPreset,
  PageSize,
  ProjectAppearance,
  SavedTheme,
  WritingMode,
} from '../types';
import {
  BACKGROUND_PRESETS,
  MARGIN_LABELS,
  PAGE_SIZE_LABELS,
  getPageDimensions,
} from '../appearance/presets';
import { Icon } from './Icon';

interface AppearanceSettingsProps {
  appearance: ProjectAppearance;
  savedThemes: SavedTheme[];
  focusMode: boolean;
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
      backgroundImage: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})`,
    };
  }
  return {
    background: `linear-gradient(135deg, ${background.color}, ${background.overlayColor})`,
  };
}

export function AppearanceSettings({
  appearance,
  savedThemes,
  focusMode,
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
}: AppearanceSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themeName, setThemeName] = useState('');
  const [imageError, setImageError] = useState('');
  const dimensions = getPageDimensions(appearance.paper);

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
            value={appearance.readingOpacity}
            min={0.2}
            max={1}
            step={0.05}
            onChange={onReadingOpacityChange}
          />
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
    </div>
  );
}
