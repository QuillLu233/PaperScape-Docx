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

export type SaveMode = 'auto' | 'manual';

export type WritingMode = 'immersive' | 'paper';
export type BackgroundKind = 'solid' | 'gradient' | 'image' | 'video';
export type BackgroundSource = 'static' | 'procedural' | 'video';
export type VideoFit = 'cover' | 'contain';
export type VideoSourceMode = 'reference' | 'copy';
export type EnvironmentAnimationType =
  | 'none'
  | 'flow'
  | 'breathe'
  | 'orbs'
  | 'aurora'
  | 'rain-traffic'
  | 'snow'
  | 'rain'
  | 'fireflies'
  | 'dust'
  | 'gradient';
export type PageSize = 'A4' | 'Letter' | 'custom';
export type MarginPreset = 'normal' | 'narrow' | 'wide' | 'custom';

export type UiColorMode = 'environment' | 'light' | 'dark' | 'system';
export type DisplayColorMode = 'auto' | 'dark' | 'light' | 'custom';
export type EnvironmentPresetType = 'official' | 'custom' | 'legacy';
export type EnvironmentPresetGroup = 'permanent' | 'festival';

export interface EnvironmentUiColors {
  titlebar: string;
  menubar: string;
  toolbar: string;
  sidebar: string;
  settings: string;
  statusbar: string;
  popup: string;
  button: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  border: string;
  ink: string;
  inkSoft: string;
  muted: string;
  hover: string;
  selected: string;
  scrollbar: string;
  caret: string;
  selection: string;
  proofreading: string;
}

export interface EnvironmentDisplaySettings {
  colorMode: DisplayColorMode;
  color: string;
  titleColor: string;
  fontFamily: string;
}

export interface EnvironmentAnimationSettings {
  enabled: boolean;
  type: string;
  effects?: string[];
  speed: number;
  intensity: number;
  color: string;
  lowPower: boolean;
  rainDensity?: number;
  trafficDensity?: number;
  trafficSpeed?: number;
  blurAmount?: number;
  snowDensity?: number;
  snowWind?: number;
  snowNight?: boolean;
}

export interface EnvironmentPreset {
  id: string;
  name: string;
  schemaVersion: 1;
  presetType: EnvironmentPresetType;
  group: EnvironmentPresetGroup;
  uiTheme: 'light' | 'dark';
  uiColors: EnvironmentUiColors;
  backgroundType: BackgroundKind;
  gradientColors: [string, string, string];
  background: BackgroundStyle;
  paper: PaperSettings;
  immersive: PaperSettings;
  display: EnvironmentDisplaySettings;
  animation: EnvironmentAnimationSettings;
  resourceReferences: string[];
}

export interface BackgroundStyle {
  presetId: string;
  name: string;
  kind: BackgroundKind;
  source?: BackgroundSource;
  color: string;
  gradientFrom: string;
  gradientMid?: string;
  gradientTo: string;
  gradientAccent?: string;
  gradientAngle: number;
  imageId: string | null;
  videoId?: string | null;
  videoName?: string;
  videoFit?: VideoFit;
  videoMode?: VideoSourceMode;
  videoPaused?: boolean;
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
  immersive: PaperSettings;
  presetId: string;
  uiTheme: 'light' | 'dark';
  uiColorMode: UiColorMode;
  uiColorModeExplicit?: boolean;
  uiColors: EnvironmentUiColors;
  display: EnvironmentDisplaySettings;
  animation: EnvironmentAnimationSettings;
}

export interface SavedTheme {
  id: string;
  name: string;
  createdAt: number;
  background: BackgroundStyle;
  readingOpacity: number;
  paper: PaperSettings;
  immersive?: PaperSettings;
  uiTheme?: 'light' | 'dark';
  uiColors?: EnvironmentUiColors;
  display?: EnvironmentDisplaySettings;
  animation?: EnvironmentAnimationSettings;
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
