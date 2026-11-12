import type { Chapter, WritingSettings, WorkspaceSnapshot } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const WORKSPACE_KEY = 'paperscape.workspace.v1';

const SEED_CHAPTERS: Chapter[] = [
  {
    id: 'chapter-morning',
    title: '纸上的清晨',
    content:
      '天还没有完全亮，窗外的树影先醒了过来。\n\n我给自己倒了一杯温水，把桌面收拾出一小块空白。写作并不总是从一句话开始，有时只是从坐下来、把呼吸放慢一点开始。\n\n今天想写的是那条穿过小镇的河。它从山脚下来，经过旧桥，再慢慢消失在田野尽头。小时候我总觉得，河水的尽头一定藏着另一个世界。',
    updatedAt: 0,
  },
  {
    id: 'chapter-wind',
    title: '风经过书桌',
    content:
      '下午的风把窗帘吹起一角，纸页跟着轻轻翻动。\n\n我停下来，听见远处有人推着自行车经过，铃声响了两下。那些细小的声音，总能把一个普通的下午变得可以记住。',
    updatedAt: 0,
  },
  {
    id: 'chapter-unfinished',
    title: '未完的句子',
    content: '有些句子需要等一等。\n\n',
    updatedAt: 0,
  },
];

export function createChapter(index: number): Chapter {
  return {
    id: createId(),
    title: `新章节 ${index}`,
    content: '',
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
    version: 1,
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
  return { fontSize, lineHeight };
}

export function loadWorkspace(): WorkspaceSnapshot {
  if (typeof localStorage === 'undefined') return createDefaultSnapshot();

  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return createDefaultSnapshot();

    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    const chapters = Array.isArray(parsed.chapters) ? parsed.chapters.filter(isChapter) : [];
    if (chapters.length === 0) return createDefaultSnapshot();

    const activeId =
      typeof parsed.activeId === 'string' && chapters.some((chapter) => chapter.id === parsed.activeId)
        ? parsed.activeId
        : chapters[0].id;

    return {
      version: 1,
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
