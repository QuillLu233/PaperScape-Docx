import type {
  BackgroundStyle,
  MarginPreset,
  PageSize,
  PaperSettings,
  ProjectAppearance,
} from '../types';
import {
  DEFAULT_ANIMATION,
  DEFAULT_BACKGROUND,
  DEFAULT_DISPLAY,
  DEFAULT_IMMERSIVE,
  DEFAULT_PAPER,
  DEFAULT_UI_COLORS,
  ORIGIN_ENVIRONMENT,
  contrastRatio,
} from './environmentPresets';

export {
  DEFAULT_ANIMATION,
  DEFAULT_BACKGROUND,
  DEFAULT_DISPLAY,
  DEFAULT_IMMERSIVE,
  DEFAULT_PAPER,
  DEFAULT_UI_COLORS,
};

export const PAGE_DIMENSIONS: Record<Exclude<PageSize, 'custom'>, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
};

export const MARGIN_VALUES: Record<Exclude<MarginPreset, 'custom'>, number> = {
  normal: 96,
  narrow: 48,
  wide: 144,
};

export const PAGE_SIZE_LABELS: Record<PageSize, string> = {
  A4: 'A4',
  Letter: 'US Letter',
  custom: '自定义',
};

export const MARGIN_LABELS: Record<MarginPreset, string> = {
  normal: '常规',
  narrow: '窄',
  wide: '宽',
  custom: '自定义',
};

export const BACKGROUND_PRESETS: Array<{ id: string; name: string; background: BackgroundStyle }> = [
  {
    id: 'warm-paper',
    name: '暖纸',
    background: {
      ...DEFAULT_BACKGROUND,
      presetId: 'warm-paper',
      name: '暖纸',
      kind: 'solid',
      color: '#e9dfcd',
      gradientFrom: '#e9dfcd',
      gradientTo: '#d7dfcf',
    },
  },
  {
    id: 'still-sage',
    name: '静绿',
    background: DEFAULT_BACKGROUND,
  },
  {
    id: 'ink-night',
    name: '墨夜',
    background: {
      ...DEFAULT_BACKGROUND,
      presetId: 'ink-night',
      name: '墨夜',
      kind: 'gradient',
      color: '#1c231e',
      gradientFrom: '#141915',
      gradientTo: '#29352c',
      vignette: 32,
      overlay: 12,
    },
  },
  {
    id: 'dusk-desk',
    name: '暮色',
    background: {
      ...DEFAULT_BACKGROUND,
      presetId: 'dusk-desk',
      name: '暮色',
      kind: 'gradient',
      color: '#564f46',
      gradientFrom: '#333b4a',
      gradientTo: '#8d7568',
      gradientAngle: 145,
      vignette: 24,
      overlay: 10,
    },
  },
  {
    id: 'morning-paper',
    name: '晨光',
    background: {
      ...DEFAULT_BACKGROUND,
      presetId: 'morning-paper',
      name: '晨光',
      kind: 'gradient',
      color: '#e5ddcd',
      gradientFrom: '#f2e4cf',
      gradientTo: '#d3dfcf',
      gradientAngle: 120,
      vignette: 10,
      overlay: 4,
    },
  },
];

export const DEFAULT_APPEARANCE: ProjectAppearance = {
  mode: 'paper',
  background: DEFAULT_BACKGROUND,
  readingOpacity: 0.8,
  paper: DEFAULT_PAPER,
  immersive: DEFAULT_IMMERSIVE,
  presetId: ORIGIN_ENVIRONMENT.id,
  uiTheme: ORIGIN_ENVIRONMENT.uiTheme,
  uiColorMode: 'environment',
  uiColors: DEFAULT_UI_COLORS,
  display: DEFAULT_DISPLAY,
  animation: DEFAULT_ANIMATION,
};

export function cloneBackground(background: BackgroundStyle): BackgroundStyle {
  return { ...background };
}

export function clonePaper(paper: PaperSettings): PaperSettings {
  return { ...paper, customMargins: { ...paper.customMargins } };
}

export function cloneAppearance(appearance: ProjectAppearance): ProjectAppearance {
  return {
    ...appearance,
    background: cloneBackground(appearance.background),
    paper: clonePaper(appearance.paper),
    immersive: clonePaper(appearance.immersive),
    uiColors: { ...appearance.uiColors },
    display: { ...appearance.display },
    animation: { ...appearance.animation },
  };
}

export function getActivePaper(appearance: ProjectAppearance): PaperSettings {
  return appearance.mode === 'immersive' ? appearance.immersive : appearance.paper;
}

export function resolveDisplayColor(
  appearance: ProjectAppearance,
  effectivePaperColor = getActivePaper(appearance).color,
): string {
  if (appearance.display.colorMode === 'custom') return appearance.display.color;
  if (appearance.display.colorMode === 'dark') return '#252820';
  if (appearance.display.colorMode === 'light') return '#f2eee4';
  const supplied = appearance.display.color;
  if (
    /^#[0-9a-f]{6}$/i.test(supplied) &&
    contrastRatio(supplied, effectivePaperColor) >= 4.5
  ) {
    return supplied;
  }
  const preferred = paperTextColors(effectivePaperColor).ink;
  const fallback = preferred === '#252820' ? '#f2eee4' : '#252820';
  return contrastRatio(preferred, effectivePaperColor) >= 4.5
    ? preferred
    : fallback;
}

export function getPageDimensions(paper: PaperSettings): { width: number; height: number } {
  if (paper.pageSize === 'custom') {
    const width = Math.min(1100, Math.max(480, paper.customWidth));
    return { width, height: Math.round(width * 1.414) };
  }
  return PAGE_DIMENSIONS[paper.pageSize];
}

export function getPaperMargins(paper: PaperSettings) {
  if (paper.margin === 'custom') return paper.customMargins;
  const value = MARGIN_VALUES[paper.margin];
  return { top: value, right: value, bottom: value, left: value };
}

export function rgbChannels(hex: string): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'fbf8ef';
  return `${Number.parseInt(normalized.slice(0, 2), 16)}, ${Number.parseInt(
    normalized.slice(2, 4),
    16,
  )}, ${Number.parseInt(normalized.slice(4, 6), 16)}`;
}

export function colorWithAlpha(hex: string, alpha: number): string {  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'fbf8ef';
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
}

export function paperTextColors(hex: string): { ink: string; muted: string; line: string } {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'fbf8ef';
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.56
    ? { ink: '#252820', muted: '#6b7265', line: 'rgba(37, 40, 32, 0.16)' }
    : { ink: '#f2eee4', muted: '#bbb8ad', line: 'rgba(242, 238, 228, 0.2)' };
}

export function getPreset(id: string) {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id);
}
