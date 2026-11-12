import type { Chapter, WritingSettings, WorkspaceSnapshot } from '../types';
import { DEFAULT_SETTINGS, EDITOR_WIDTH_MAX, EDITOR_WIDTH_MIN } from '../types';
import {
  countCharactersFromHtml,
  excerptFromHtml,
  normalizeEditorContent,
  plainTextToHtml,
} from './richText';

const WORKSPACE_KEY = 'paperscape.workspace.v1';
const STORAGE_VERSION = 2;

const SEED_TEXT: Array<{ id: string; title: string; text: string }> = [
  {
    id: 'chapter-morning',
    title: '纸上的清晨',
    text: '天还没有完全亮，窗外的树影先醒了过来。\n\n我给自己倒了一杯温水，把桌面收拾出一小块空白。写作并不总是从一句话开始，有时只是从坐下来、把呼吸放慢一点开始。\n\n今天想写的是那条穿过小镇的河。它从山脚下来，经过旧桥，再慢慢消失在田野尽头。小时候我总觉得，河水的尽头一定藏着另一个世界。',
  },
  {
    id: 'chapter-wind',
    title: '风经过书桌',
    text: '下午的风把窗帘吹起一角，纸页跟着轻轻翻动。\n\n我停下来，听见远处有人推着自行车经过，铃声响了两下。那些细小的声音，总能把一个普通的下午变得可以记住。',
  },
  {
    id: 'chapter-unfinished',
    title: '未完的句子',
    text: '有些句子需要等一等。\n\n',
  },
];

const SEED_CHAPTERS: Chapter[] = SEED_TEXT.map((seed) => {
  const content = plainTextToHtml(seed.text);
  return {
    id: seed.id,
    title: seed.title,
    content,
    characterCount: countCharactersFromHtml(content),
    excerpt: excerptFromHtml(content),
    updatedAt: 0,
  };
});

export function createChapter(index: number): Chapter {
  return {
    id: createId(),
    title: `新章节 ${index}`,
    content: '',
    characterCount: 0,
    excerpt: '',
    updatedAt: Date.now(),
  };
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chapter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultSnapshot(): WorkspaceSnapshot {
  return {
    version: STORAGE_VERSION,
    chapters: SEED_CHAPTERS,
    activeId: SEED_CHAPTERS[0].id,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isChapter(value: unknown): value is Chapter {
  if (!value || typeof value !== 'object') return false;
  const chapter = value as Partial<Chapter>;
  return (
    typeof chapter.id === 'string' &&
    typeof chapter.title === 'string' &&
    typeof chapter.content === 'string'
  );
}

function sanitizeSettings(value: unknown): WritingSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const settings = value as Partial<WritingSettings>;
  const fontSize =
    typeof settings.fontSize === 'number'
      ? Math.min(24, Math.max(14, settings.fontSize))
      : DEFAULT_SETTINGS.fontSize;
  const lineHeight =
    typeof settings.lineHeight === 'number'
      ? Math.min(2.4, Math.max(1.4, settings.lineHeight))
      : DEFAULT_SETTINGS.lineHeight;
  const editorWidth =
    typeof settings.editorWidth === 'number'
      ? Math.min(EDITOR_WIDTH_MAX, Math.max(EDITOR_WIDTH_MIN, settings.editorWidth))
      : DEFAULT_SETTINGS.editorWidth;
  return { fontSize, lineHeight, editorWidth };
}

function normalizeChapter(chapter: Chapter, sourceVersion: number): Chapter {
  const content = normalizeEditorContent(chapter.content, sourceVersion);
  return {
    ...chapter,
    content,
    characterCount:
      sourceVersion >= 2 && typeof chapter.characterCount === 'number'
        ? chapter.characterCount
        : countCharactersFromHtml(content),
    excerpt:
      sourceVersion >= 2 && typeof chapter.excerpt === 'string'
        ? chapter.excerpt
        : excerptFromHtml(content),
  };
}

export function loadWorkspace(): WorkspaceSnapshot {
  if (typeof localStorage === 'undefined') return createDefaultSnapshot();

  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return createDefaultSnapshot();

    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot> & { version?: number };
    const sourceVersion = typeof parsed.version === 'number' ? parsed.version : 1;
    const chapters = Array.isArray(parsed.chapters)
      ? parsed.chapters
          .filter(isChapter)
          .map((chapter) => normalizeChapter(chapter, sourceVersion))
      : [];
    if (chapters.length === 0) return createDefaultSnapshot();

    const activeId =
      typeof parsed.activeId === 'string' && chapters.some((chapter) => chapter.id === parsed.activeId)
        ? parsed.activeId
        : chapters[0].id;

    return {
      version: STORAGE_VERSION,
      chapters,
      activeId,
      settings: sanitizeSettings(parsed.settings),
    };
  } catch {
    return createDefaultSnapshot();
  }
}

export function saveWorkspace(snapshot: WorkspaceSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
  } catch {
    // A full or unavailable storage must never break the editor.
  }
}
