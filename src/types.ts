export type ThemeMode = 'light' | 'dark' | 'system';

export interface Chapter {
  id: string;
  title: string;
  /** Sanitized Tiptap HTML. */
  content: string;
  /** Cached character count so long documents never need parsing during render. */
  characterCount: number;
  /** Cached plain-text preview for the chapter list. */
  excerpt: string;
  updatedAt: number;
}

export interface WritingSettings {
  fontSize: number;
  lineHeight: number;
  editorWidth: number;
}

export interface WorkspaceSnapshot {
  version: 2;
  chapters: Chapter[];
  activeId: string;
  settings: WritingSettings;
}

export const EDITOR_WIDTH_MIN = 640;
export const EDITOR_WIDTH_MAX = 980;

export const DEFAULT_SETTINGS: WritingSettings = {
  fontSize: 18,
  lineHeight: 1.9,
  editorWidth: 790,
};

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};
