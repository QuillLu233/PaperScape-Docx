import { beforeEach, describe, expect, it } from 'vitest';
import {
  OFFICIAL_ENVIRONMENTS,
  contrastRatio,
  getOfficialEnvironment,
} from './environmentPresets';
import {
  DEFAULT_APPEARANCE,
  cloneAppearance,
  getActivePaper,
  resolveDisplayColor,
} from './presets';
import {
  applyEnvironmentPreset,
  createEnvironmentFromAppearance,
  exportEnvironmentPreset,
  importEnvironmentPreset,
  sanitizeAppearance,
} from './storage';
import { resolveUiTheme } from './themeRuntime';

describe('V2 environment presets', () => {
  beforeEach(() => localStorage.clear());

  it('provides thirteen complete official environments', () => {
    expect(OFFICIAL_ENVIRONMENTS).toHaveLength(13);
    expect(new Set(OFFICIAL_ENVIRONMENTS.map((preset) => preset.id)).size).toBe(13);
    expect(OFFICIAL_ENVIRONMENTS.filter((preset) => preset.group === 'permanent')).toHaveLength(11);
    expect(OFFICIAL_ENVIRONMENTS.filter((preset) => preset.group === 'festival')).toHaveLength(2);
    for (const preset of OFFICIAL_ENVIRONMENTS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.gradientColors).toHaveLength(3);
      expect(preset.background.gradientMid).toBe(preset.gradientColors[1]);
      expect(preset.uiColors.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.paper.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.immersive.customWidth).toBeGreaterThan(600);
      expect(preset.display.colorMode).toBe('auto');
    }
  });

  it('registers the two festival environments with their reference palettes', () => {
    const christmas = getOfficialEnvironment('christmas-carol')!;
    expect(christmas.group).toBe('festival');
    expect(christmas.uiColors.titlebar).toBe('#203C33');
    expect(christmas.uiColors.sidebar).toBe('#29483D');
    expect(christmas.uiColors.accent).toBe('#E9CB8D');
    expect(christmas.uiColors.border).toBe('#577266');
    expect(christmas.uiColors.selected).toBe('#416652');
    expect(christmas.paper.color).toBe('#FFF6E6');

    const spring = getOfficialEnvironment('spring-festival')!;
    expect(spring.group).toBe('festival');
    expect(spring.uiColors.titlebar).toBe('#F7ECDF');
    expect(spring.uiColors.sidebar).toBe('#EDDDCF');
    expect(spring.uiColors.accent).toBe('#AD3933');
    expect(spring.uiColors.border).toBe('#D8B9A5');
    expect(spring.uiColors.selected).toBe('#ECD1C4');
    expect(spring.paper.color).toBe('#FFF5E2');
  });

  it('preserves the classic environment when migrating old appearance data', () => {
    const migrated = sanitizeAppearance({
      mode: 'immersive',
      readingOpacity: 0.62,
      background: { kind: 'gradient' },
      paper: { color: '#1b1d1a' },
    });
    expect(migrated.uiColorMode).toBe('system');
    expect(migrated.presetId).toBe('legacy');
    expect(migrated.mode).toBe('immersive');
    expect(migrated.readingOpacity).toBe(0.62);
    expect(migrated.paper.color).toBe('#1b1d1a');
  });

  it('applies a preset without changing the current writing mode', () => {
    const appearance = { ...cloneAppearance(DEFAULT_APPEARANCE), mode: 'immersive' as const };
    const preset = getOfficialEnvironment('aurora')!;
    const next = applyEnvironmentPreset(appearance, preset);
    expect(next.mode).toBe('immersive');
    expect(next.presetId).toBe('aurora');
    expect(next.uiTheme).toBe('dark');
    expect(next.background.gradientMid).toBe(preset.gradientColors[1]);
    expect(next.uiColors.accent).toBe(preset.uiColors.accent);
  });

  it('resolves environment and classic UI color modes', () => {
    expect(resolveUiTheme('environment', 'dark', 'light')).toBe('dark');
    expect(resolveUiTheme('light', 'dark', 'dark')).toBe('light');
    expect(resolveUiTheme('dark', 'light', 'light')).toBe('dark');
    expect(resolveUiTheme('system', 'light', 'dark')).toBe('dark');
  });

  it('keeps auto display text readable and honors overrides', () => {
    const light = cloneAppearance(DEFAULT_APPEARANCE);
    light.display.colorMode = 'auto';
    expect(resolveDisplayColor(light)).toBe('#344536');

    const dark = cloneAppearance(DEFAULT_APPEARANCE);
    dark.paper.color = '#1b1d1a';
    expect(resolveDisplayColor(dark)).toBe('#f2eee4');
    expect(contrastRatio(resolveDisplayColor(dark), dark.paper.color)).toBeGreaterThanOrEqual(4.5);

    dark.display.colorMode = 'custom';
    dark.display.color = '#ffcc00';
    expect(resolveDisplayColor(dark)).toBe('#ffcc00');
  });

  it('round-trips a custom environment through versioned JSON import/export', () => {
    const source = cloneAppearance(DEFAULT_APPEARANCE);
    source.mode = 'immersive';
    source.paper.color = '#f0e6d2';
    source.immersive.customWidth = 740;
    const preset = createEnvironmentFromAppearance('我的夜间环境', source);
    const json = exportEnvironmentPreset(preset);
    expect(json).toContain('"schemaVersion": 1');
    const imported = importEnvironmentPreset(json);
    expect(imported.name).toBe('我的夜间环境');
    expect(imported.paper.color).toBe('#f0e6d2');
    expect(imported.immersive.customWidth).toBe(740);
  });

  it('rejects invalid imported environment documents', () => {
    expect(() => importEnvironmentPreset('{')).toThrow();
    expect(() => importEnvironmentPreset(JSON.stringify({ schemaVersion: 9 }))).toThrow();
    expect(() =>
      importEnvironmentPreset(JSON.stringify({ schemaVersion: 1, name: '', background: {} })),
    ).toThrow();
  });

  it('uses the active paper settings for paper and immersive modes', () => {
    const appearance = cloneAppearance(DEFAULT_APPEARANCE);
    appearance.mode = 'immersive';
    appearance.immersive.customWidth = 720;
    expect(getActivePaper(appearance).customWidth).toBe(720);
    appearance.mode = 'paper';
    expect(getActivePaper(appearance).customWidth).toBe(794);
  });
});
