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

  it('assigns static defaults and theme-driven procedural defaults', () => {
    expect(getOfficialEnvironment('origin')!.animation).toMatchObject({
      enabled: false,
      type: 'none',
    });
    expect(getOfficialEnvironment('pure')!.animation).toMatchObject({
      enabled: false,
      type: 'none',
    });
    expect(getOfficialEnvironment('midnight')!.animation).toMatchObject({
      enabled: false,
      type: 'none',
    });
    expect(getOfficialEnvironment('aurora')!.animation).toMatchObject({
      enabled: true,
      type: 'aurora',
    });
    expect(getOfficialEnvironment('deep-ocean')!.animation.type).toBe('flow');
    expect(getOfficialEnvironment('violet-night')!.animation.type).toBe('orbs');
    expect(getOfficialEnvironment('winter')!.animation.type).toBe('snow');
    expect(getOfficialEnvironment('christmas-carol')!.animation.type).toBe('snow');
    for (const preset of OFFICIAL_ENVIRONMENTS) {
      if (preset.id === 'origin' || preset.id === 'pure' || preset.id === 'midnight') {
        expect(preset.animation.enabled).toBe(false);
        expect(preset.animation.type).toBe('none');
      } else {
        expect(preset.animation.enabled).toBe(true);
        expect(preset.animation.type).not.toBe('none');
      }
    }
  });

  it('registers the two festival environments with their reference palettes', () => {
    const christmas = getOfficialEnvironment('christmas-carol')!;
    expect(christmas.group).toBe('festival');
    expect(christmas.uiColors.titlebar).toBe('#682D37');
    expect(christmas.uiColors.sidebar).toBe('#51232C');
    expect(christmas.uiColors.toolbar).toBe('#51232C');
    expect(christmas.uiColors.statusbar).toBe('#51232C');
    expect(christmas.uiColors.popup).toBe('#682D37');
    expect(christmas.uiColors.inkSoft).toBe('#D8BEC0');
    expect(christmas.uiColors.accent).toBe('#F1D5A0');
    expect(christmas.uiColors.border).toBe('#89565E');
    expect(christmas.uiColors.hover).toBe('#783840');
    expect(christmas.uiColors.selected).toBe('#8B434B');
    expect(christmas.uiColors.caret).toBe('#873244');
    expect(christmas.uiColors.selection).toBe('#EAD0C3');
    expect(christmas.paper.color).toBe('#FFF7E9');
    expect(christmas.display.color).toBe('#533C35');
    expect(christmas.display.titleColor).toBe('#503038');
    expect(christmas.background.gradientAccent).toBe('#F1D5A0');
    expect(christmas.animation.effects).toEqual(['snow', 'gradient', 'golden-glow']);

    const spring = getOfficialEnvironment('spring-festival')!;
    expect(spring.group).toBe('festival');
    expect(spring.uiColors.titlebar).toBe('#F7ECDF');
    expect(spring.uiColors.sidebar).toBe('#EDDDCF');
    expect(spring.uiColors.accent).toBe('#AD3933');
    expect(spring.uiColors.border).toBe('#D8B9A5');
    expect(spring.uiColors.selected).toBe('#ECD1C4');
    expect(spring.paper.color).toBe('#FFF5E2');
  });

  it('sanitizes procedural and video background settings', () => {
    const appearance = sanitizeAppearance({
      background: {
        kind: 'video',
        videoId: 'video-1',
        videoName: 'night.mp4',
        videoFit: 'contain',
        videoMode: 'copy',
        videoPaused: true,
      },
      animation: {
        enabled: true,
        type: 'rain-traffic',
        rainDensity: 0.7,
        trafficDensity: 0.4,
        trafficSpeed: 0.9,
        snowDensity: 0.2,
        snowWind: -0.3,
        snowNight: true,
      },
    });
    expect(appearance.background.kind).toBe('video');
    expect(appearance.background.videoId).toBe('video-1');
    expect(appearance.background.videoFit).toBe('contain');
    expect(appearance.background.videoPaused).toBe(true);
    expect(appearance.animation.type).toBe('rain-traffic');
    expect(appearance.animation.rainDensity).toBe(0.7);
    expect(appearance.animation.trafficDensity).toBe(0.4);
    expect(appearance.animation.snowWind).toBe(-0.3);
  });

  it('upgrades an untouched old official Christmas snapshot', () => {
    const migrated = sanitizeAppearance({
      presetId: 'christmas-carol',
      paper: { color: '#FFF6E6' },
      uiColors: { titlebar: '#203C33' },
      background: { gradientFrom: '#142F29' },
    });
    expect(migrated.presetId).toBe('christmas-carol');
    expect(migrated.uiColors.titlebar).toBe('#682D37');
    expect(migrated.paper.color).toBe('#FFF7E9');
    expect(migrated.display.color).toBe('#533C35');
    expect(migrated.background.gradientAccent).toBe('#F1D5A0');
  });

  it('repairs an intermediate Christmas snapshot with the old display color', () => {
    const migrated = sanitizeAppearance({
      presetId: 'christmas-carol',
      paper: { color: '#FFF7E9' },
      uiColors: { titlebar: '#682D37' },
      display: { color: '#FFF1E0' },
      background: { gradientFrom: '#781C2D' },
    });
    expect(migrated.display.color).toBe('#533C35');
  });

  it('defaults to following the preset but preserves an explicit UI color choice', () => {
    const automatic = cloneAppearance(DEFAULT_APPEARANCE);
    automatic.uiColorMode = 'dark';
    automatic.uiColorModeExplicit = false;
    const appliedAutomatic = applyEnvironmentPreset(
      automatic,
      getOfficialEnvironment('spring-festival')!,
    );
    expect(appliedAutomatic.uiColorMode).toBe('environment');

    const explicit = cloneAppearance(DEFAULT_APPEARANCE);
    explicit.uiColorMode = 'dark';
    explicit.uiColorModeExplicit = true;
    const appliedExplicit = applyEnvironmentPreset(
      explicit,
      getOfficialEnvironment('spring-festival')!,
    );
    expect(appliedExplicit.uiColorMode).toBe('dark');
  });

  it('preserves the classic environment when migrating old appearance data', () => {
    const migrated = sanitizeAppearance({
      mode: 'immersive',
      readingOpacity: 0.62,
      background: { kind: 'gradient' },
      paper: { color: '#1b1d1a' },
    });
    expect(migrated.uiColorMode).toBe('system');
    expect(migrated.uiColorModeExplicit).toBe(true);
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
