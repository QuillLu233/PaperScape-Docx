import type { EnvironmentUiColors, UiColorMode } from '../types';
import { mixColor } from './environmentPresets';

const UI_COLOR_VARS: Array<[keyof EnvironmentUiColors, string]> = [
  ['titlebar', '--ui-titlebar'],
  ['menubar', '--ui-menubar'],
  ['toolbar', '--ui-toolbar'],
  ['sidebar', '--ui-sidebar'],
  ['settings', '--ui-settings'],
  ['statusbar', '--ui-statusbar'],
  ['popup', '--ui-popup'],
  ['button', '--ui-button'],
  ['accent', '--ui-accent'],
  ['accentStrong', '--ui-accent-strong'],
  ['accentSoft', '--ui-accent-soft'],
  ['border', '--ui-border'],
  ['ink', '--ui-ink'],
  ['inkSoft', '--ui-ink-soft'],
  ['muted', '--ui-muted'],
  ['hover', '--ui-hover'],
  ['selected', '--ui-selected'],
  ['scrollbar', '--scroll-thumb'],
  ['caret', '--caret'],
  ['selection', '--selection'],
  ['proofreading', '--proofreading'],
];

const CORE_COLOR_VARS = [
  '--bg',
  '--panel',
  '--panel-alt',
  '--panel-muted',
  '--ink',
  '--ink-soft',
  '--muted',
  '--line',
  '--line-strong',
  '--accent',
  '--accent-strong',
  '--accent-soft',
  '--accent-line',
  '--focus',
  '--scroll-thumb',
  '--caret',
  '--selection',
  '--proofreading',
];

export function resolveUiTheme(
  mode: UiColorMode,
  environmentTheme: 'light' | 'dark',
  classicTheme: 'light' | 'dark',
): 'light' | 'dark' {
  if (mode === 'environment') return environmentTheme;
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return classicTheme;
}

export function applyEnvironmentCss(colors: EnvironmentUiColors): void {
  const root = document.documentElement;
  const values: Record<string, string> = {
    '--bg': colors.titlebar,
    '--panel': colors.titlebar,
    '--panel-alt': colors.hover,
    '--panel-muted': mixColor(colors.titlebar, colors.sidebar, 0.5),
    '--ink': colors.ink,
    '--ink-soft': colors.inkSoft,
    '--muted': colors.muted,
    '--line': colors.border,
    '--line-strong': mixColor(colors.border, colors.ink, 0.22),
    '--accent': colors.accent,
    '--accent-strong': colors.accentStrong,
    '--accent-soft': colors.accentSoft,
    '--accent-line': mixColor(colors.accent, colors.border, 0.5),
    '--focus': colors.selection,
    '--scroll-thumb': colors.scrollbar,
    '--caret': colors.caret,
    '--selection': colors.selection,
    '--proofreading': colors.proofreading,
  };
  for (const [key, variable] of UI_COLOR_VARS) {
    root.style.setProperty(variable, colors[key]);
  }
  for (const [key, value] of Object.entries(values)) {
    root.style.setProperty(key, value);
  }
}

export function clearEnvironmentCss(): void {
  const root = document.documentElement;
  for (const variable of CORE_COLOR_VARS) root.style.removeProperty(variable);
  for (const [, variable] of UI_COLOR_VARS) root.style.removeProperty(variable);
}
