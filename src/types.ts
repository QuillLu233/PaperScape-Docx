export type ThemeMode = 'light' | 'dark' | 'system';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface WritingSettings {
  fontSize: number;
  lineHeight: number;
}

export interface WorkspaceSnapshot {
  version: 1;
  chapters: Chapter[];
  activeId: string;
  settings: WritingSettings;
}

export const DEFAULT_SETTINGS: WritingSettings = {
  fontSize: 18,
  lineHeight: 1.9,
};

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};
