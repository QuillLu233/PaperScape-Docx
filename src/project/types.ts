import type { JSONContent } from '@tiptap/core';
import type { ProjectAppearance, WritingSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { sanitizeAppearance } from '../appearance/storage';

export interface ChapterSummary {
  id: string;
  title: string;
  file: string;
  updatedAt: number;
  characterCount: number;
  excerpt: string;
}

export interface ChapterFile {
  version: number;
  id: string;
  title: string;
  /** Primary storage is a Tiptap JSON document. */
  doc: JSONContent;
  updatedAt: number;
  characterCount: number;
  excerpt: string;
}

export interface ProjectMeta {
  version: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sessionClean: boolean;
  activeChapterId: string | null;
  chapters: ChapterSummary[];
  appearance: ProjectAppearance;
  settings: WritingSettings;
}

export interface OpenProject {
  path: string;
  meta: ProjectMeta;
  activeChapter: ChapterFile | null;
  recovery: RecoveryCandidate[];
  warnings: string[];
  metaRecovered: boolean;
  activeRecovered: boolean;
}

export interface RecoveryCandidate {
  chapterId: string;
  title: string;
  updatedAt: number;
  characterCount: number;
  excerpt: string;
}

export interface ChapterRead {
  chapter: ChapterFile;
  recovered: boolean;
  warning: string | null;
}

export interface SaveChapterResult {
  chapter: ChapterFile;
  meta: ProjectMeta;
  historyFile: string | null;
  recovered: boolean;
  warning: string | null;
}

export interface CreateChapterResult {
  chapter: ChapterFile;
  meta: ProjectMeta;
}

export interface DeleteChapterResult {
  meta: ProjectMeta;
  activeChapter: ChapterFile | null;
  warnings: string[];
}

export interface HistoryEntry {
  file: string;
  timestamp: number;
  reason: string;
  characterCount: number;
  title: string;
}

export interface RecentProject {
  path: string;
  name: string;
  lastOpenedAt: number;
  chapterCount: number;
  characterCount: number;
}

export interface SaveChapterInput {
  id: string;
  title: string;
  doc: JSONContent;
  updatedAt: number;
  characterCount: number;
  excerpt: string;
}

export const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function normalizeChapter(chapter: ChapterFile): ChapterFile {
  return {
    ...chapter,
    version: chapter.version || 1,
    title: chapter.title || '未命名章节',
    doc:
      chapter.doc && typeof chapter.doc === 'object'
        ? chapter.doc
        : structuredClone(EMPTY_DOC),
    characterCount: Number.isFinite(chapter.characterCount) ? chapter.characterCount : 0,
    excerpt: chapter.excerpt || '',
  };
}

export function normalizeMeta(meta: ProjectMeta): ProjectMeta {
  const appearance = sanitizeAppearance(meta.appearance);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(meta.settings && typeof meta.settings === 'object' ? meta.settings : {}),
  };
  return {
    ...meta,
    version: meta.version || 1,
    name: meta.name || '未命名项目',
    chapters: Array.isArray(meta.chapters) ? meta.chapters : [],
    appearance,
    settings,
    activeChapterId: meta.activeChapterId ?? null,
    sessionClean: Boolean(meta.sessionClean),
  };
}

export function chapterToSaveInput(chapter: ChapterFile): SaveChapterInput {
  return {
    id: chapter.id,
    title: chapter.title || '未命名章节',
    doc: chapter.doc,
    updatedAt: chapter.updatedAt,
    characterCount: chapter.characterCount,
    excerpt: chapter.excerpt,
  };
}

export function joinProjectPath(parent: string, name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[. ]+$/g, '');
  const folder = cleaned || '未命名项目';
  const separator = parent.includes('\\') ? '\\' : '/';
  return `${parent.replace(/[\\/]+$/g, '')}${separator}${folder}.paperscape`;
}
