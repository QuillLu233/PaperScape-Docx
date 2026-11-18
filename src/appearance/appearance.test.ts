import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE,
  cloneAppearance,
  getPageDimensions,
  getPaperMargins,
  paperTextColors,
} from './presets';
import {
  createSavedTheme,
  loadProjectAppearance,
  loadSavedThemes,
  sanitizeAppearance,
  saveProjectAppearance,
  saveSavedThemes,
} from './storage';

describe('appearance settings', () => {
  beforeEach(() => localStorage.clear());

  it('provides a paper mode default with A4 dimensions', () => {
    expect(DEFAULT_APPEARANCE.mode).toBe('paper');
    expect(getPageDimensions(DEFAULT_APPEARANCE.paper)).toEqual({ width: 794, height: 1123 });
    expect(getPaperMargins(DEFAULT_APPEARANCE.paper)).toEqual({
      top: 96,
      right: 96,
      bottom: 96,
      left: 96,
    });
  });

  it('clamps unsafe serialized values', () => {
    const appearance = sanitizeAppearance({
      mode: 'unknown',
      readingOpacity: 9,
      paper: {
        pageSize: 'Letter',
        opacity: -1,
        shadow: 1000,
        margin: 'narrow',
        color: 'not-a-color',
      },
      background: {
        kind: 'image',
        brightness: 999,
        blur: -4,
        vignette: 200,
        overlay: 200,
        overlayColor: '#123456',
      },
    });

    expect(appearance.mode).toBe('paper');
    expect(appearance.readingOpacity).toBe(1);
    expect(appearance.paper.pageSize).toBe('Letter');
    expect(appearance.paper.opacity).toBe(0.45);
    expect(appearance.paper.shadow).toBe(100);
    expect(appearance.paper.color).toBe('#FAF9F0');
    expect(appearance.background.kind).toBe('image');
    expect(appearance.background.brightness).toBe(150);
    expect(appearance.background.blur).toBe(0);
    expect(appearance.background.vignette).toBe(100);
    expect(appearance.background.overlay).toBe(80);
  });

  it('keeps independent themes for different projects', () => {
    const projectA = cloneAppearance(DEFAULT_APPEARANCE);
    projectA.mode = 'immersive';
    projectA.background.presetId = 'ink-night';
    projectA.background.kind = 'gradient';
    projectA.readingOpacity = 0.55;

    const projectB = cloneAppearance(DEFAULT_APPEARANCE);
    projectB.mode = 'paper';
    projectB.paper.pageSize = 'Letter';

    saveProjectAppearance('project-a', projectA);
    saveProjectAppearance('project-b', projectB);

    expect(loadProjectAppearance('project-a').mode).toBe('immersive');
    expect(loadProjectAppearance('project-a').readingOpacity).toBe(0.55);
    expect(loadProjectAppearance('project-b').mode).toBe('paper');
    expect(loadProjectAppearance('project-b').paper.pageSize).toBe('Letter');
  });

  it('chooses readable ink for light and dark paper colors', () => {
    expect(paperTextColors('#fbf8ef').ink).toBe('#252820');
    expect(paperTextColors('#1b1d1a').ink).toBe('#f2eee4');
  });

  it('saves reusable custom themes with their page and background settings', () => {
    const source = cloneAppearance(DEFAULT_APPEARANCE);
    source.paper.pageSize = 'custom';
    source.paper.customWidth = 700;
    source.background.color = '#dde5d9';

    const theme = createSavedTheme('我的纸页', source);
    saveSavedThemes([theme]);

    const loaded = loadSavedThemes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('我的纸页');
    expect(loaded[0].paper.customWidth).toBe(700);
    expect(loaded[0].background.presetId).toBe(theme.id);
  });
});
