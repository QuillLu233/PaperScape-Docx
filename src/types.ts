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

export type WritingMode = 'immersive' | 'paper';
export type BackgroundKind = 'solid' | 'gradient' | 'image';
export type PageSize = 'A4' | 'Letter' | 'custom';
export type MarginPreset = 'normal' | 'narrow' | 'wide' | 'custom';

export interface BackgroundStyle {
  presetId: string;
  name: string;
  kind: BackgroundKind;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  imageId: string | null;
  brightness: number;
  blur: number;
  vignette: number;
  overlay: number;
  overlayColor: string;
}

export interface PaperMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaperSettings {
  pageSize: PageSize;
  customWidth: number;
  color: string;
  opacity: number;
  shadow: number;
  margin: MarginPreset;
  customMargins: PaperMargins;
}

export interface ProjectAppearance {
  mode: WritingMode;
  background: BackgroundStyle;
  readingOpacity: number;
  paper: PaperSettings;
}

export interface SavedTheme {
  id: string;
  name: string;
  createdAt: number;
  background: BackgroundStyle;
  readingOpacity: number;
  paper: PaperSettings;
}

export interface WorkspaceSnapshot {
  version: 3;
  projectId: string;
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
