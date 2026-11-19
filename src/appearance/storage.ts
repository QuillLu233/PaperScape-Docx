import type {
  BackgroundKind,
  BackgroundStyle,
  EnvironmentAnimationSettings,
  EnvironmentDisplaySettings,
  EnvironmentPreset,
  EnvironmentUiColors,
  MarginPreset,
  PageSize,
  PaperSettings,
  ProjectAppearance,
  SavedTheme,
  UiColorMode,
} from '../types';
import {
  BACKGROUND_PRESETS,
  DEFAULT_APPEARANCE,
  DEFAULT_BACKGROUND,
  DEFAULT_PAPER,
  cloneAppearance,
  cloneBackground,
  clonePaper,
  paperTextColors,
} from './presets';
import {
  DEFAULT_ANIMATION,
  DEFAULT_DISPLAY,
  DEFAULT_UI_COLORS,
  OFFICIAL_ENVIRONMENTS,
  getOfficialEnvironment,
} from './environmentPresets';

const APPEARANCE_KEY = 'paperscape.project-appearance.v1';
const SAVED_THEMES_KEY = 'paperscape.saved-themes.v1';
const ENVIRONMENT_PRESETS_KEY = 'paperscape.environment-presets.v1';
const MEDIA_DB = 'paperscape-media';
const MEDIA_STORE = 'backgrounds';
const VIDEO_STORE = 'background-videos';
const MEDIA_DB_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function sanitizeBackground(value: unknown): BackgroundStyle {
  if (!isRecord(value)) return cloneBackground(DEFAULT_BACKGROUND);
  const kind: BackgroundKind =
    value.kind === 'solid' ||
    value.kind === 'gradient' ||
    value.kind === 'image' ||
    value.kind === 'video'
      ? value.kind
      : DEFAULT_BACKGROUND.kind;
  const presetId = typeof value.presetId === 'string' ? value.presetId : 'custom';
  const source =
    value.source === 'environment' ||
    value.source === 'custom' ||
    value.source === 'procedural' ||
    value.source === 'video'
      ? value.source
      : value.kind === 'video'
        ? 'video'
        : value.kind === 'image'
          ? 'custom'
          : 'environment';
  return {
    presetId,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : '自定义背景',
    kind,
    source,
    color: safeColor(value.color, DEFAULT_BACKGROUND.color),
    gradientFrom: safeColor(value.gradientFrom, DEFAULT_BACKGROUND.gradientFrom),
    gradientMid: safeColor(value.gradientMid, DEFAULT_BACKGROUND.gradientMid ?? DEFAULT_BACKGROUND.gradientFrom),
    gradientTo: safeColor(value.gradientTo, DEFAULT_BACKGROUND.gradientTo),
    gradientAccent:
      value.gradientAccent === undefined
        ? undefined
        : safeColor(value.gradientAccent, DEFAULT_BACKGROUND.gradientFrom),
    gradientAngle: clampNumber(value.gradientAngle, 0, 360, DEFAULT_BACKGROUND.gradientAngle),
    imageId: typeof value.imageId === 'string' && value.imageId ? value.imageId : null,
    videoId: typeof value.videoId === 'string' && value.videoId ? value.videoId : null,
    videoName: typeof value.videoName === 'string' ? value.videoName.slice(0, 240) : '',
    videoFit: value.videoFit === 'contain' ? 'contain' : 'cover',
    videoMode: value.videoMode === 'reference' ? 'reference' : 'copy',
    videoPaused: value.videoPaused === true,
    brightness: clampNumber(value.brightness, 30, 150, 100),
    blur: clampNumber(value.blur, 0, 24, 0),
    vignette: clampNumber(value.vignette, 0, 100, 20),
    overlay: clampNumber(value.overlay, 0, 80, 8),
    overlayColor: safeColor(value.overlayColor, DEFAULT_BACKGROUND.overlayColor),
  };
}

function sanitizePaper(value: unknown): PaperSettings {
  if (!isRecord(value)) return clonePaper(DEFAULT_PAPER);
  const pageSize: PageSize =
    value.pageSize === 'A4' || value.pageSize === 'Letter' || value.pageSize === 'custom'
      ? value.pageSize
      : DEFAULT_PAPER.pageSize;
  const margin: MarginPreset =
    value.margin === 'normal' ||
    value.margin === 'narrow' ||
    value.margin === 'wide' ||
    value.margin === 'custom'
      ? value.margin
      : DEFAULT_PAPER.margin;
  const margins = isRecord(value.customMargins) ? value.customMargins : {};
  return {
    pageSize,
    customWidth: clampNumber(value.customWidth, 480, 1100, DEFAULT_PAPER.customWidth),
    color: safeColor(value.color, DEFAULT_PAPER.color),
    opacity: clampNumber(value.opacity, 0.45, 1, DEFAULT_PAPER.opacity),
    shadow: clampNumber(value.shadow, 0, 100, DEFAULT_PAPER.shadow),
    margin,
    customMargins: {
      top: clampNumber(margins.top, 16, 240, 96),
      right: clampNumber(margins.right, 16, 240, 96),
      bottom: clampNumber(margins.bottom, 16, 240, 96),
      left: clampNumber(margins.left, 16, 240, 96),
    },
  };
}

function sanitizeUiColors(value: unknown): EnvironmentUiColors {
  if (!isRecord(value)) return { ...DEFAULT_UI_COLORS };
  const base = DEFAULT_UI_COLORS;
  const keys: Array<keyof EnvironmentUiColors> = [
    'titlebar',
    'menubar',
    'toolbar',
    'sidebar',
    'settings',
    'statusbar',
    'popup',
    'button',
    'accent',
    'accentStrong',
    'accentSoft',
    'border',
    'ink',
    'inkSoft',
    'muted',
    'hover',
    'selected',
    'scrollbar',
    'caret',
    'selection',
    'proofreading',
  ];
  const result: Record<string, string> = { ...base };
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const name = key as string;
    result[name] = safeColor(record[name], base[key]);
  }
  return result as unknown as EnvironmentUiColors;
}

function sanitizeDisplay(value: unknown): EnvironmentDisplaySettings {
  const record = isRecord(value) ? value : {};
  const mode = record.colorMode;
  return {
    colorMode:
      mode === 'auto' || mode === 'dark' || mode === 'light' || mode === 'custom'
        ? mode
        : DEFAULT_DISPLAY.colorMode,
    color: safeColor(record.color, DEFAULT_DISPLAY.color),
    titleColor: safeColor(record.titleColor, safeColor(record.color, DEFAULT_DISPLAY.color)),
    fontFamily:
      typeof record.fontFamily === 'string' ? record.fontFamily.slice(0, 160) : '',
  };
}

function sanitizeAnimation(value: unknown): EnvironmentAnimationSettings {
  const record = isRecord(value) ? value : {};
  const rawType = typeof record.type === 'string' ? record.type.slice(0, 40) : 'none';
  const type =
    rawType === 'gradient'
      ? 'flow'
      : rawType === 'rain'
        ? 'rain-traffic'
        : rawType === 'fireflies' || rawType === 'dust'
          ? 'orbs'
          : rawType;
  return {
    enabled: record.enabled === true,
    paused: record.paused === true,
    sceneId: typeof record.sceneId === 'string' ? record.sceneId.slice(0, 80) : undefined,
    type,
    effects: Array.isArray(record.effects)
      ? record.effects.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [],
    speed: clampNumber(record.speed, 0.2, 3, DEFAULT_ANIMATION.speed),
    intensity: clampNumber(record.intensity, 0, 1, DEFAULT_ANIMATION.intensity),
    color: safeColor(record.color, DEFAULT_ANIMATION.color),
    lowPower: record.lowPower !== false,
    rainDensity: clampNumber(record.rainDensity, 0, 1, DEFAULT_ANIMATION.rainDensity ?? 0.55),
    trafficDensity: clampNumber(record.trafficDensity, 0, 1, DEFAULT_ANIMATION.trafficDensity ?? 0.5),
    trafficSpeed: clampNumber(record.trafficSpeed, 0.1, 2, DEFAULT_ANIMATION.trafficSpeed ?? 0.55),
    blurAmount: clampNumber(record.blurAmount, 0, 24, DEFAULT_ANIMATION.blurAmount ?? 8),
    snowDensity: clampNumber(record.snowDensity, 0, 1, DEFAULT_ANIMATION.snowDensity ?? 0.55),
    snowWind: clampNumber(record.snowWind, -1, 1, DEFAULT_ANIMATION.snowWind ?? 0.18),
    snowNight: record.snowNight === true,
  };
}

export function sanitizeAppearance(value: unknown): ProjectAppearance {  if (!isRecord(value)) return cloneAppearance(DEFAULT_APPEARANCE);
  const paper = sanitizePaper(value.paper);
  const legacyMode = value.uiColorMode;
  const uiColorMode: UiColorMode =
    legacyMode === 'environment' ||
    legacyMode === 'light' ||
    legacyMode === 'dark' ||
    legacyMode === 'system'
      ? legacyMode
      : 'system';
  const uiColorModeExplicit =
    typeof value.uiColorModeExplicit === 'boolean'
      ? value.uiColorModeExplicit
      : uiColorMode !== 'environment';
  const uiTheme: 'light' | 'dark' =
    value.uiTheme === 'dark' || value.uiTheme === 'light'
      ? value.uiTheme
      : paperTextColors(paper.color).ink === '#252820'
        ? 'light'
        : 'dark';
  const result: ProjectAppearance = {
    mode: value.mode === 'immersive' || value.mode === 'paper' ? value.mode : 'paper',
    background: sanitizeBackground(value.background),
    readingOpacity: clampNumber(value.readingOpacity, 0.2, 1, DEFAULT_APPEARANCE.readingOpacity),
    paper,
    immersive: sanitizePaper(value.immersive ?? value.paper),
    presetId: typeof value.presetId === 'string' && value.presetId ? value.presetId : 'legacy',
    uiTheme,
    uiColorMode,
    uiColorModeExplicit,
    uiColors: sanitizeUiColors(value.uiColors),
    display: sanitizeDisplay(value.display),
    animation: sanitizeAnimation(value.animation),
  };
  // V2 Phase 1.1 refreshed the official Christmas palette. Only upgrade the
  // untouched old official snapshot; personal/customized presets stay intact.
  const isOldOfficialChristmas =
    result.presetId === 'christmas-carol' &&
    result.paper.color === '#FFF6E6' &&
    result.uiColors.titlebar === '#203C33' &&
    result.background.gradientFrom === '#142F29';
  if (isOldOfficialChristmas) {
    const refreshed = getOfficialEnvironment('christmas-carol');
    if (refreshed) return applyEnvironmentPreset(result, refreshed);
  }
  const isIntermediateChristmas =
    result.presetId === 'christmas-carol' &&
    result.paper.color === '#FFF7E9' &&
    result.uiColors.titlebar === '#682D37' &&
    result.display.color === '#FFF1E0';
  if (isIntermediateChristmas) {
    return { ...result, display: { ...result.display, color: '#533C35' } };
  }
  return result;
}

function readMap(): Record<string, ProjectAppearance> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? '{}');
    if (!isRecord(parsed)) return {};
    const map: Record<string, ProjectAppearance> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof id === 'string') map[id] = sanitizeAppearance(value);
    }
    return map;
  } catch {
    return {};
  }
}

export function loadProjectAppearance(projectId: string): ProjectAppearance {
  const stored = readMap()[projectId];
  return stored ? cloneAppearance(stored) : cloneAppearance(DEFAULT_APPEARANCE);
}

export function saveProjectAppearance(projectId: string, appearance: ProjectAppearance): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const map = readMap();
    map[projectId] = sanitizeAppearance(appearance);
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(map));
  } catch {
    // Appearance failures must never break writing.
  }
}

export function loadSavedThemes(): SavedTheme[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_THEMES_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === 'string')
      .map((item) => ({
        id: item.id as string,
        name: typeof item.name === 'string' && item.name ? item.name : '自定义主题',
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        background: sanitizeBackground(item.background),
        readingOpacity: clampNumber(item.readingOpacity, 0.2, 1, 0.8),
        paper: sanitizePaper(item.paper),
        immersive: sanitizePaper(item.immersive ?? item.paper),
        uiTheme: item.uiTheme === 'dark' ? 'dark' : 'light',
        uiColors: sanitizeUiColors(item.uiColors),
        display: sanitizeDisplay(item.display),
        animation: sanitizeAnimation(item.animation),
      }));
  } catch {
    return [];
  }
}

export function saveSavedThemes(themes: SavedTheme[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // Ignore quota failures; the current appearance still works.
  }
}

export function createThemeId(): string {
  return `theme-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const LEGACY_ENVIRONMENT_MIGRATED_KEY = 'paperscape.environment-presets.migrated.v1';

function legacyThemeToEnvironment(theme: SavedTheme): EnvironmentPreset {
  const paper = clonePaper(theme.paper);
  return {
    id: `legacy-${theme.id}`,
    name: theme.name,
    schemaVersion: 1,
    presetType: 'custom',
    group: 'permanent',
    uiTheme: theme.uiTheme ?? 'light',
    uiColors: theme.uiColors ? { ...theme.uiColors } : { ...DEFAULT_UI_COLORS },
    backgroundType: theme.background.kind,
    gradientColors: [
      theme.background.gradientFrom,
      theme.background.gradientMid ?? theme.background.gradientFrom,
      theme.background.gradientTo,
    ],
    background: cloneBackground(theme.background),
    paper,
    immersive: theme.immersive ? clonePaper(theme.immersive) : clonePaper(paper),
    display: theme.display ? { ...theme.display } : { ...DEFAULT_DISPLAY },
    animation: theme.animation ? { ...theme.animation } : { ...DEFAULT_ANIMATION },
    resourceReferences: theme.background.imageId ? [theme.background.imageId] : [],
  };
}

export function sanitizeEnvironmentPreset(value: unknown): EnvironmentPreset | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1) return null;
  const background = sanitizeBackground(value.background);
  const paper = sanitizePaper(value.paper);
  const immersive = sanitizePaper(value.immersive ?? value.paper);
  const uiColors = sanitizeUiColors(value.uiColors);
  const uiTheme = value.uiTheme === 'dark' ? 'dark' : 'light';
  const presetType = value.presetType === 'legacy' ? 'legacy' : 'custom';
  const gradientColors: [string, string, string] = [
    safeColor(
      Array.isArray(value.gradientColors) ? value.gradientColors[0] : undefined,
      background.gradientFrom,
    ),
    safeColor(
      Array.isArray(value.gradientColors) ? value.gradientColors[1] : undefined,
      background.gradientMid ?? background.gradientFrom,
    ),
    safeColor(
      Array.isArray(value.gradientColors) ? value.gradientColors[2] : undefined,
      background.gradientTo,
    ),
  ];
  return {
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id.slice(0, 100)
        : `environment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: value.name.trim().slice(0, 60),
    schemaVersion: 1,
    presetType,
    group: value.group === 'festival' ? 'festival' : 'permanent',
    uiTheme,
    uiColors,
    backgroundType:
      background.kind === 'image' || background.kind === 'solid' || background.kind === 'gradient'
        ? background.kind
        : 'gradient',
    gradientColors,
    background,
    paper,
    immersive,
    display: sanitizeDisplay(value.display),
    animation: sanitizeAnimation(value.animation),
    resourceReferences: Array.isArray(value.resourceReferences)
      ? value.resourceReferences.filter((item): item is string => typeof item === 'string').slice(0, 20)
      : [],
  };
}

export function loadEnvironmentPresets(): EnvironmentPreset[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ENVIRONMENT_PRESETS_KEY);
    if (raw === null) {
      const legacy = loadSavedThemes().map(legacyThemeToEnvironment);
      if (legacy.length > 0) saveEnvironmentPresets(legacy);
      localStorage.setItem(LEGACY_ENVIRONMENT_MIGRATED_KEY, '1');
      return legacy;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeEnvironmentPreset(item))
      .filter((item): item is EnvironmentPreset => Boolean(item));
  } catch {
    return [];
  }
}

export function saveEnvironmentPresets(presets: EnvironmentPreset[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      ENVIRONMENT_PRESETS_KEY,
      JSON.stringify(presets.filter((preset) => preset.presetType !== 'official')),
    );
  } catch {
    // Preset persistence failures must not interrupt writing.
  }
}

export function createEnvironmentFromAppearance(
  name: string,
  appearance: ProjectAppearance,
): EnvironmentPreset {
  const id = `environment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    name: name.trim() || '我的环境',
    schemaVersion: 1,
    presetType: 'custom',
    group: 'permanent',
    uiTheme: appearance.uiTheme,
    uiColors: { ...appearance.uiColors },
    backgroundType: appearance.background.kind,
    gradientColors: [
      appearance.background.gradientFrom,
      appearance.background.gradientMid ?? appearance.background.gradientFrom,
      appearance.background.gradientTo,
    ],
    background: cloneBackground(appearance.background),
    paper: clonePaper(appearance.paper),
    immersive: clonePaper(appearance.immersive),
    display: { ...appearance.display },
    animation: { ...appearance.animation },
    resourceReferences: appearance.background.imageId ? [appearance.background.imageId] : [],
  };
}

export function applyEnvironmentPreset(
  appearance: ProjectAppearance,
  preset: EnvironmentPreset,
): ProjectAppearance {
  return {
    ...appearance,
    presetId: preset.id,
    uiTheme: preset.uiTheme,
    uiColorMode: preset.presetType === 'official' ? 'environment' : appearance.uiColorMode,
    uiColorModeExplicit: preset.presetType === 'official' ? false : appearance.uiColorModeExplicit,
    uiColors: { ...preset.uiColors },
    paper: clonePaper(preset.paper),
    immersive: clonePaper(preset.immersive),
    readingOpacity: preset.immersive.opacity,
    display: { ...preset.display },
    background: {
      ...cloneBackground(preset.background),
      source:
        preset.presetType === 'official'
          ? 'environment'
          : preset.background.source ?? 'environment',
    },
    animation:
      preset.presetType === 'official'
        ? {
            ...preset.animation,
            enabled: false,
            paused: false,
            sceneId: undefined,
            type: 'none',
          }
        : { ...preset.animation },
  };
}

export function exportEnvironmentPreset(preset: EnvironmentPreset): string {
  return JSON.stringify(
    {
      ...preset,
      presetType: 'custom',
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function importEnvironmentPreset(text: string): EnvironmentPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('预设文件不是有效的 JSON');
  }
  if (!isRecord(parsed)) throw new Error('预设文件格式无效');
  if (parsed.schemaVersion !== 1) throw new Error('不支持的预设版本');
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
    throw new Error('预设缺少名称');
  }
  const sanitized = sanitizeEnvironmentPreset(parsed);
  if (!sanitized) throw new Error('预设字段校验失败');
  const officialIds = new Set(OFFICIAL_ENVIRONMENTS.map((preset) => preset.id));
  if (officialIds.has(sanitized.id)) sanitized.id = createThemeId();
  sanitized.presetType = 'custom';
  return sanitized;
}

export function createBackgroundPreset(presetId: string): BackgroundStyle {
  const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId);
  return cloneBackground(preset?.background ?? DEFAULT_BACKGROUND);
}

export function createSavedTheme(
  name: string,
  appearance: ProjectAppearance,
): SavedTheme {
  const id = createThemeId();
  return {
    id,
    name: name.trim() || '我的主题',
    createdAt: Date.now(),
    background: {
      ...cloneBackground(appearance.background),
      presetId: id,
      name: name.trim() || '我的主题',
    },
    readingOpacity: appearance.readingOpacity,
    paper: clonePaper(appearance.paper),
    immersive: clonePaper(appearance.immersive),
    uiTheme: appearance.uiTheme,
    uiColors: { ...appearance.uiColors },
    display: { ...appearance.display },
    animation: { ...appearance.animation },
  };
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'));
      return;
    }
    const request = indexedDB.open(MEDIA_DB, MEDIA_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
      if (!db.objectStoreNames.contains(VIDEO_STORE)) db.createObjectStore(VIDEO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开图片存储'));
  });
}

export async function putBackgroundImage(id: string, blob: Blob): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readwrite');
    transaction.objectStore(MEDIA_STORE).put(blob, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('图片保存失败'));
  });
  db.close();
}

export async function getBackgroundImage(id: string): Promise<Blob | undefined> {
  const db = await openMediaDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readonly');
    const request = transaction.objectStore(MEDIA_STORE).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => reject(request.error ?? new Error('图片读取失败'));
  });
  db.close();
  return blob;
}

export async function deleteBackgroundImage(id: string): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readwrite');
    transaction.objectStore(MEDIA_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('图片删除失败'));
  });
  db.close();
}

export async function putBackgroundVideo(id: string, blob: Blob): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readwrite');
    transaction.objectStore(VIDEO_STORE).put(blob, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('视频保存失败'));
  });
  db.close();
}

export async function getBackgroundVideo(id: string): Promise<Blob | undefined> {
  const db = await openMediaDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readonly');
    const request = transaction.objectStore(VIDEO_STORE).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => reject(request.error ?? new Error('视频读取失败'));
  });
  db.close();
  return blob;
}

export async function deleteBackgroundVideo(id: string): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(VIDEO_STORE, 'readwrite');
    transaction.objectStore(VIDEO_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('视频删除失败'));
  });
  db.close();
}

const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export async function prepareBackgroundVideo(file: File): Promise<Blob> {
  if (!['video/mp4', 'video/webm'].includes(file.type)) {
    throw new Error('仅支持 MP4 或 WebM 背景视频');
  }
  if (file.size > MAX_VIDEO_BYTES) throw new Error('背景视频不能超过 300 MB');
  return file;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2560;
const PASS_THROUGH_BYTES = 2 * 1024 * 1024;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取这张图片'));
    };
    image.src = url;
  });
}

/**
 * Large wallpaper files are decoded once at import and stored as a downscaled
 * WebP blob. The runtime then reuses the same object URL for CSS painting.
 */
export async function prepareBackgroundImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('仅支持 JPG、PNG、WebP 背景图片');
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error('背景图片不能超过 15 MB');

  const image = await loadImageElement(file);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight, 1);
  if (file.size <= PASS_THROUGH_BYTES && largestEdge <= MAX_IMAGE_EDGE) return file;

  const scale = Math.min(1, MAX_IMAGE_EDGE / largestEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.86),
  );
  return blob ?? file;
}
