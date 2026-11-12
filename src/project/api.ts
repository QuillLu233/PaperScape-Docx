import { invoke } from '@tauri-apps/api/core';
import type { ProjectAppearance, WritingSettings } from '../types';
import type {
  ChapterFile,
  ChapterRead,
  CreateChapterResult,
  DeleteChapterResult,
  HistoryEntry,
  OpenProject,
  ProjectMeta,
  RecentProject,
  SaveChapterInput,
  SaveChapterResult,
} from './types';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function chooseFolder(title: string): Promise<string | null> {
  return invoke<string | null>('choose_folder', { title });
}

export async function getDefaultProjectParent(): Promise<string> {
  return invoke<string>('project_default_parent');
}

export async function createProject(
  path: string,
  name: string,
  appearance: ProjectAppearance,
  settings: WritingSettings,
): Promise<OpenProject> {
  return invoke<OpenProject>('project_create', { path, name, appearance, settings });
}

export async function openProject(path: string): Promise<OpenProject> {
  return invoke<OpenProject>('project_open', { path });
}

export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>('project_list_recent');
}

export async function saveChapter(
  projectPath: string,
  chapter: SaveChapterInput,
  reason: string,
): Promise<SaveChapterResult> {
  return invoke<SaveChapterResult>('project_save_chapter', {
    projectPath,
    chapter,
    reason,
  });
}

export async function loadChapter(projectPath: string, chapterId: string): Promise<ChapterRead> {
  return invoke<ChapterRead>('project_load_chapter', { projectPath, chapterId });
}

export async function savePreferences(
  projectPath: string,
  appearance: ProjectAppearance,
  settings: WritingSettings,
  activeChapterId: string | null,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>('project_save_preferences', {
    projectPath,
    appearance,
    settings,
    activeChapterId,
  });
}

export async function createChapter(
  projectPath: string,
  title: string,
): Promise<CreateChapterResult> {
  return invoke<CreateChapterResult>('project_create_chapter', { projectPath, title });
}

export async function renameChapter(
  projectPath: string,
  chapterId: string,
  title: string,
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>('project_rename_chapter', { projectPath, chapterId, title });
}

export async function reorderChapters(
  projectPath: string,
  orderedIds: string[],
): Promise<ProjectMeta> {
  return invoke<ProjectMeta>('project_reorder_chapters', { projectPath, orderedIds });
}

export async function deleteChapter(
  projectPath: string,
  chapterId: string,
): Promise<DeleteChapterResult> {
  return invoke<DeleteChapterResult>('project_delete_chapter', { projectPath, chapterId });
}

export async function closeProject(projectPath: string): Promise<ProjectMeta> {
  return invoke<ProjectMeta>('project_close', { projectPath });
}

export async function listHistory(
  projectPath: string,
  chapterId: string,
): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>('project_list_history', { projectPath, chapterId });
}

export async function restoreHistory(
  projectPath: string,
  chapterId: string,
  historyFile: string,
): Promise<ChapterRead> {
  return invoke<ChapterRead>('project_restore_history', {
    projectPath,
    chapterId,
    historyFile,
  });
}

export async function restoreRecovery(
  projectPath: string,
  chapterId: string,
): Promise<ChapterRead> {
  return invoke<ChapterRead>('project_restore_recovery', { projectPath, chapterId });
}

export async function discardRecovery(projectPath: string, chapterId: string): Promise<void> {
  return invoke<void>('project_discard_recovery', { projectPath, chapterId });
}

export function emptyChapterDoc(): ChapterFile {
  return {
    version: 1,
    id: '',
    title: '未命名章节',
    doc: { type: 'doc', content: [{ type: 'paragraph' }] },
    updatedAt: 0,
    characterCount: 0,
    excerpt: '',
  };
}
