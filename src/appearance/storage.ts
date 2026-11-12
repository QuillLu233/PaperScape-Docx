import type {
  BackgroundKind,
  BackgroundStyle,
  MarginPreset,
  PageSize,
  PaperSettings,
  ProjectAppearance,
  SavedTheme,
} from '../types';
import {
  BACKGROUND_PRESETS,
  DEFAULT_APPEARANCE,
  DEFAULT_BACKGROUND,
  DEFAULT_PAPER,
  cloneAppearance,
  cloneBackground,
  clonePaper,
} from './presets';

const APPEARANCE_KEY = 'paperscape.project-appearance.v1';
const SAVED_THEMES_KEY = 'paperscape.saved-themes.v1';
const MEDIA_DB = 'paperscape-media';
const MEDIA_STORE = 'backgrounds';
const MEDIA_DB_VERSION = 1;

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
    value.kind === 'solid' || value.kind === 'gradient' || value.kind === 'image'
      ? value.kind
      : DEFAULT_BACKGROUND.kind;
  const presetId = typeof value.presetId === 'string' ? value.presetId : 'custom';
  return {
    presetId,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : '自定义背景',
    kind,
    color: safeColor(value.color, DEFAULT_BACKGROUND.color),
    gradientFrom: safeColor(value.gradientFrom, DEFAULT_BACKGROUND.gradientFrom),
    gradientTo: safeColor(value.gradientTo, DEFAULT_BACKGROUND.gradientTo),
    gradientAngle: clampNumber(value.gradientAngle, 0, 360, DEFAULT_BACKGROUND.gradientAngle),
    imageId: typeof value.imageId === 'string' && value.imageId ? value.imageId : null,
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

export function sanitizeAppearance(value: unknown): ProjectAppearance {
  if (!isRecord(value)) return cloneAppearance(DEFAULT_APPEARANCE);
  return {
    mode: value.mode === 'immersive' || value.mode === 'paper' ? value.mode : 'paper',
    background: sanitizeBackground(value.background),
    readingOpacity: clampNumber(value.readingOpacity, 0.2, 1, DEFAULT_APPEARANCE.readingOpacity),
    paper: sanitizePaper(value.paper),
  };
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
  if (file.size <= PASS_THROUGH_BYTES) return file;

  const image = await loadImageElement(file);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight, 1);
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
