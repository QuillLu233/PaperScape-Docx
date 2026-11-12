import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { ProjectAppearance, WritingSettings } from '../types';
import { DEFAULT_APPEARANCE, cloneAppearance } from '../appearance/presets';
import { DEFAULT_SETTINGS } from '../types';
import * as projectApi from './api';
import { loadLegacyChapters } from './legacy';
import {
  chapterToSaveInput,
  normalizeChapter,
  normalizeMeta,
  type ChapterFile,
  type CreateChapterResult,
  type HistoryEntry,
  type OpenProject,
  type ProjectMeta,
  type RecentProject,
  type RecoveryCandidate,
} from './types';

const AUTOSAVE_MS = 800;
const META_SAVE_MS = 350;

type ChapterPatch = Partial<Pick<ChapterFile, 'title' | 'doc' | 'characterCount' | 'excerpt'>>;

interface ProjectState {
  path: string;
  meta: ProjectMeta;
}

function summaryFromChapter(chapter: ChapterFile) {
  return {
    id: chapter.id,
    title: chapter.title,
    file: `chapters/${chapter.id}.json`,
    updatedAt: chapter.updatedAt,
    characterCount: chapter.characterCount,
    excerpt: chapter.excerpt,
  };
}

function withChapterSummary(meta: ProjectMeta, chapter: ChapterFile): ProjectMeta {
  const summary = summaryFromChapter(chapter);
  const chapters = meta.chapters.some((item) => item.id === chapter.id)
    ? meta.chapters.map((item) => (item.id === chapter.id ? summary : item))
    : [...meta.chapters, summary];
  return { ...meta, chapters, activeChapterId: chapter.id };
}

function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return '项目操作失败';
}

export function useProject() {
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [project, setProject] = useState<ProjectState | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterFile | null>(null);
  const [recovery, setRecovery] = useState<RecoveryCandidate[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(Date.now());
  const [dirty, setDirty] = useState(false);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [error, setError] = useState('');

  const projectRef = useRef<ProjectState | null>(project);
  const activeRef = useRef<ChapterFile | null>(activeChapter);
  const dirtyRef = useRef(dirty);
  const metaRevisionRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const metaTimerRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const closeRequestedRef = useRef(false);

  projectRef.current = project;
  activeRef.current = activeChapter;
  dirtyRef.current = dirty;

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const refreshRecent = useCallback(async () => {
    if (!projectApi.isTauriRuntime()) return;
    try {
      setRecent(await projectApi.listRecentProjects());
    } catch {
      // Recent projects are a convenience; never block project opening.
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
  }, [refreshRecent]);

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const clearMetaTimer = useCallback(() => {
    if (metaTimerRef.current !== null) {
      window.clearTimeout(metaTimerRef.current);
      metaTimerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async (reason: string): Promise<boolean> => {
    const state = projectRef.current;
    const chapter = activeRef.current;
    if (!state || !chapter || !dirtyRef.current) return true;
    const snapshot = chapter;
    const revisionAtStart = metaRevisionRef.current;
    pendingSavesRef.current += 1;
    setSaving(true);
    try {
      const result = await projectApi.saveChapter(
        state.path,
        chapterToSaveInput(snapshot),
        reason,
      );
      const savedMeta = normalizeMeta(result.meta);
      const local = projectRef.current?.meta;
      const meta =
        revisionAtStart === metaRevisionRef.current || !local
          ? savedMeta
          : {
              ...savedMeta,
              appearance: local.appearance,
              settings: local.settings,
              activeChapterId: local.activeChapterId,
            };
      setProject((current) => (current ? { ...current, meta } : current));
      projectRef.current = projectRef.current
        ? { ...projectRef.current, meta }
        : projectRef.current;
      if (
        activeRef.current?.id === snapshot.id &&
        activeRef.current.updatedAt === snapshot.updatedAt
      ) {
        dirtyRef.current = false;
        setDirty(false);
      }
      setSavedAt(Date.now());
      if (result.warning) {
        setWarnings((current) => (current.includes(result.warning!) ? current : [...current, result.warning!]));
      }
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      return false;
    } finally {
      pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);
      setSaving(pendingSavesRef.current > 0);
    }
  }, []);

  const saveChapterNow = useCallback(
    (reason = 'manual') => {
      clearSaveTimer();
      return enqueue(() => performSave(reason));
    },
    [clearSaveTimer, enqueue, performSave],
  );

  const performPreferences = useCallback(async (): Promise<boolean> => {
    const state = projectRef.current;
    if (!state) return true;
    const revision = metaRevisionRef.current;
    const meta = state.meta;
    try {
      const result = await projectApi.savePreferences(
        state.path,
        meta.appearance,
        meta.settings,
        meta.activeChapterId,
      );
      if (metaRevisionRef.current === revision) {
        const normalized = normalizeMeta(result);
        setProject((current) => (current ? { ...current, meta: normalized } : current));
        projectRef.current = projectRef.current
          ? { ...projectRef.current, meta: normalized }
          : projectRef.current;
        setSavedAt(Date.now());
      }
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      return false;
    }
  }, []);

  const savePreferencesNow = useCallback(() => {
    clearMetaTimer();
    return enqueue(() => performPreferences());
  }, [clearMetaTimer, enqueue, performPreferences]);

  const scheduleAutosave = useCallback(() => {
    clearSaveTimer();
    saveTimerRef.current = window.setTimeout(() => {
      void saveChapterNow('autosave');
    }, AUTOSAVE_MS);
  }, [clearSaveTimer, saveChapterNow]);

  const scheduleMetaSave = useCallback(() => {
    clearMetaTimer();
    metaTimerRef.current = window.setTimeout(() => {
      void savePreferencesNow();
    }, META_SAVE_MS);
  }, [clearMetaTimer, savePreferencesNow]);

  const saveNow = useCallback(
    async (reason = 'manual') => {
      clearSaveTimer();
      const ok = await saveChapterNow(reason);
      if (!ok) return false;
      return savePreferencesNow();
    },
    [clearSaveTimer, saveChapterNow, savePreferencesNow],
  );

  const applyOpened = useCallback((opened: OpenProject) => {
    const meta = normalizeMeta(opened.meta);
    const chapter = opened.activeChapter ? normalizeChapter(opened.activeChapter) : null;
    const state = { path: opened.path, meta };
    projectRef.current = state;
    activeRef.current = chapter;
    dirtyRef.current = false;
    setProject(state);
    setActiveChapter(chapter);
    setRecovery(opened.recovery ?? []);
    setWarnings(opened.warnings ?? []);
    setDirty(false);
    setSavedAt(Date.now());
    setLoading(false);
    setError('');
    void refreshRecent();
  }, [refreshRecent]);

  const closeProject = useCallback(async (): Promise<boolean> => {
    const state = projectRef.current;
    if (!state) return true;
    setLoading(true);
    const saved = await saveNow('close');
    if (!saved) {
      setLoading(false);
      return false;
    }
    try {
      await projectApi.closeProject(state.path);
      projectRef.current = null;
      activeRef.current = null;
      dirtyRef.current = false;
      setProject(null);
      setActiveChapter(null);
      setRecovery([]);
      setWarnings([]);
      setDirty(false);
      setSavedAt(Date.now());
      await refreshRecent();
      return true;
    } catch (closeError) {
      setError(errorMessage(closeError));
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshRecent, saveNow]);

  const openProject = useCallback(
    async (path?: string): Promise<boolean> => {
      if (!projectApi.isTauriRuntime()) {
        setError('项目管理需要在 PaperScape 桌面应用中使用。');
        return false;
      }
      setLoading(true);
      setError('');
      try {
        const chosen = path ?? (await projectApi.chooseFolder('打开 PaperScape 项目'));
        if (!chosen) {
          setLoading(false);
          return false;
        }
        if (projectRef.current && !(await closeProject())) return false;
        setLoading(true);
        const opened = await projectApi.openProject(chosen);
        applyOpened(opened);
        return true;
      } catch (openError) {
        setError(errorMessage(openError));
        setLoading(false);
        return false;
      }
    },
    [applyOpened, closeProject],
  );

  const createProject = useCallback(
    async (parent: string, name: string): Promise<boolean> => {
      if (!projectApi.isTauriRuntime()) {
        setError('项目管理需要在 PaperScape 桌面应用中使用。');
        return false;
      }
      if (projectRef.current && !(await closeProject())) return false;
      setLoading(true);
      setError('');
      try {
        const folder = (name.trim() || '未命名项目')
          .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
          .replace(/[. ]+$/g, '');
        const separator = parent.includes('\\') ? '\\' : '/';
        const path = `${parent.replace(/[\\/]+$/g, '')}${separator}${folder}.paperscape`;
        const opened = await projectApi.createProject(
          path,
          folder,
          cloneAppearance(DEFAULT_APPEARANCE),
          { ...DEFAULT_SETTINGS },
        );
        applyOpened(opened);
        return true;
      } catch (createError) {
        setError(errorMessage(createError));
        setLoading(false);
        return false;
      }
    },
    [applyOpened, closeProject],
  );

  const openRecent = useCallback(
    (path: string) => openProject(path),
    [openProject],
  );

  const importLegacy = useCallback(async (): Promise<boolean> => {
    if (!projectApi.isTauriRuntime()) {
      setError('项目管理需要在 PaperScape 桌面应用中使用。');
      return false;
    }
    const legacy = loadLegacyChapters();
    if (legacy.length === 0) {
      setError('没有找到旧版本地草稿。');
      return false;
    }
    if (projectRef.current && !(await closeProject())) return false;
    setLoading(true);
    setError('');
    try {
      const parent = await projectApi.getDefaultProjectParent();
      const separator = parent.includes('\\') ? '\\' : '/';
      const path = `${parent.replace(/[\\/]+$/g, '')}${separator}旧草稿导入.paperscape`;
      const opened = await projectApi.createProject(
        path,
        '旧草稿导入',
        cloneAppearance(DEFAULT_APPEARANCE),
        { ...DEFAULT_SETTINGS },
      );
      if (!opened.activeChapter) throw new Error('新项目没有初始章节');
      let firstId = opened.activeChapter.id;
      for (let index = 0; index < legacy.length; index += 1) {
        const item = legacy[index];
        let chapterId = firstId;
        if (index > 0) {
          const created = await projectApi.createChapter(path, item.title);
          chapterId = created.chapter.id;
        }
        await projectApi.saveChapter(
          path,
          {
            id: chapterId,
            title: item.title,
            doc: item.doc,
            updatedAt: Date.now(),
            characterCount: item.characterCount,
            excerpt: item.excerpt,
          },
          'legacy-import',
        );
      }
      const finalOpened = await projectApi.openProject(path);
      firstId = finalOpened.meta.chapters[0]?.id ?? firstId;
      const finalMeta = await projectApi.savePreferences(
        path,
        finalOpened.meta.appearance,
        finalOpened.meta.settings,
        firstId,
      );
      applyOpened({ ...finalOpened, meta: finalMeta });
      return true;
    } catch (importError) {
      setError(errorMessage(importError));
      setLoading(false);
      return false;
    }
  }, [applyOpened, closeProject]);

  const selectChapter = useCallback(
    async (id: string): Promise<boolean> => {
      const state = projectRef.current;
      if (!state || activeRef.current?.id === id) return true;
      if (!(await saveNow('chapter-switch'))) return false;
      setLoading(true);
      try {
        const result = await projectApi.loadChapter(state.path, id);
        const chapter = normalizeChapter(result.chapter);
        activeRef.current = chapter;
        dirtyRef.current = false;
        setActiveChapter(chapter);
        setDirty(false);
        setSavedAt(Date.now());
        const nextMeta = { ...state.meta, activeChapterId: id };
        projectRef.current = { ...state, meta: nextMeta };
        setProject(projectRef.current);
        metaRevisionRef.current += 1;
        await savePreferencesNow();
        if (result.warning) setWarnings((current) => [...current, result.warning!]);
        return true;
      } catch (loadError) {
        setError(errorMessage(loadError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [saveNow, savePreferencesNow],
  );

  const updateActiveChapter = useCallback(
    (patch: ChapterPatch) => {
      const current = activeRef.current;
      const state = projectRef.current;
      if (!current || !state) return;
      const next: ChapterFile = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
      };
      activeRef.current = next;
      dirtyRef.current = true;
      setActiveChapter(next);
      setDirty(true);
      const meta = withChapterSummary(state.meta, next);
      projectRef.current = { ...state, meta };
      setProject(projectRef.current);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const updateAppearance = useCallback(
    (patch: Partial<ProjectAppearance>) => {
      const state = projectRef.current;
      if (!state) return;
      const meta = {
        ...state.meta,
        appearance: { ...state.meta.appearance, ...patch },
        updatedAt: Date.now(),
      };
      projectRef.current = { ...state, meta };
      setProject(projectRef.current);
      metaRevisionRef.current += 1;
      scheduleMetaSave();
    },
    [scheduleMetaSave],
  );

  const updateSettings = useCallback(
    (patch: Partial<WritingSettings>) => {
      const state = projectRef.current;
      if (!state) return;
      const meta = {
        ...state.meta,
        settings: { ...state.meta.settings, ...patch },
        updatedAt: Date.now(),
      };
      projectRef.current = { ...state, meta };
      setProject(projectRef.current);
      metaRevisionRef.current += 1;
      scheduleMetaSave();
    },
    [scheduleMetaSave],
  );

  const createChapter = useCallback(async (): Promise<boolean> => {
    const state = projectRef.current;
    if (!state) return false;
    if (!(await saveNow('before-create'))) return false;
    setLoading(true);
    try {
      const result: CreateChapterResult = await projectApi.createChapter(
        state.path,
        `第 ${state.meta.chapters.length + 1} 章`,
      );
      const meta = normalizeMeta(result.meta);
      const chapter = normalizeChapter(result.chapter);
      projectRef.current = { path: state.path, meta };
      activeRef.current = chapter;
      dirtyRef.current = false;
      setProject(projectRef.current);
      setActiveChapter(chapter);
      setDirty(false);
      setSavedAt(Date.now());
      return true;
    } catch (createError) {
      setError(errorMessage(createError));
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveNow]);

  const renameChapter = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      const state = projectRef.current;
      if (!state) return false;
      const normalizedTitle = title.trim() || '未命名章节';
      if (activeRef.current?.id === id) {
        const next = { ...activeRef.current, title: normalizedTitle, updatedAt: Date.now() };
        activeRef.current = next;
        dirtyRef.current = true;
        setActiveChapter(next);
        setDirty(true);
        const meta = withChapterSummary(state.meta, next);
        projectRef.current = { ...state, meta };
        setProject(projectRef.current);
        return saveChapterNow('rename');
      }
      try {
        const meta = normalizeMeta(await projectApi.renameChapter(state.path, id, normalizedTitle));
        projectRef.current = { ...state, meta };
        setProject(projectRef.current);
        return true;
      } catch (renameError) {
        setError(errorMessage(renameError));
        return false;
      }
    },
    [saveChapterNow],
  );

  const moveChapter = useCallback(
    async (id: string, direction: 'up' | 'down'): Promise<boolean> => {
      const state = projectRef.current;
      if (!state) return false;
      if (!(await saveNow('before-reorder'))) return false;
      const index = state.meta.chapters.findIndex((chapter) => chapter.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= state.meta.chapters.length) return true;
      const ordered = state.meta.chapters.map((chapter) => chapter.id);
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      try {
        const meta = normalizeMeta(await projectApi.reorderChapters(state.path, ordered));
        projectRef.current = { ...state, meta };
        setProject(projectRef.current);
        return true;
      } catch (reorderError) {
        setError(errorMessage(reorderError));
        return false;
      }
    },
    [saveNow],
  );

  const deleteChapter = useCallback(
    async (id: string): Promise<boolean> => {
      const state = projectRef.current;
      if (!state) return false;
      if (!(await saveNow('before-delete'))) return false;
      setLoading(true);
      try {
        const result = await projectApi.deleteChapter(state.path, id);
        const meta = normalizeMeta(result.meta);
        const chapter = result.activeChapter ? normalizeChapter(result.activeChapter) : null;
        projectRef.current = { path: state.path, meta };
        activeRef.current = chapter;
        dirtyRef.current = false;
        setProject(projectRef.current);
        setActiveChapter(chapter);
        setDirty(false);
        if (result.warnings.length) {
          setWarnings((current) => [...current, ...result.warnings]);
        }
        return true;
      } catch (deleteError) {
        setError(errorMessage(deleteError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [saveNow],
  );

  const history = useCallback(
    async (chapterId: string): Promise<HistoryEntry[]> => {
      const state = projectRef.current;
      if (!state) return [];
      return projectApi.listHistory(state.path, chapterId);
    },
    [],
  );

  const restoreHistory = useCallback(
    async (chapterId: string, historyFile: string): Promise<boolean> => {
      const state = projectRef.current;
      if (!state) return false;
      if (!(await saveNow('before-restore'))) return false;
      try {
        const result = await projectApi.restoreHistory(state.path, chapterId, historyFile);
        const chapter = normalizeChapter(result.chapter);
        if (activeRef.current?.id === chapterId) {
          activeRef.current = chapter;
          setActiveChapter(chapter);
          setDocumentRevision((current) => current + 1);
        }
        const meta = state.meta.chapters.some((item) => item.id === chapterId)
          ? withChapterSummary(state.meta, chapter)
          : state.meta;
        projectRef.current = { ...state, meta };
        setProject(projectRef.current);
        if (result.warning) setWarnings((current) => [...current, result.warning!]);
        return true;
      } catch (restoreError) {
        setError(errorMessage(restoreError));
        return false;
      }
    },
    [saveNow],
  );

  const restoreRecovery = useCallback(
    async (chapterId: string): Promise<boolean> => {
      const state = projectRef.current;
      if (!state) return false;
      try {
        const result = await projectApi.restoreRecovery(state.path, chapterId);
        const chapter = normalizeChapter(result.chapter);
        activeRef.current = chapter;
        dirtyRef.current = false;
        setActiveChapter(chapter);
        setDocumentRevision((current) => current + 1);
        setDirty(false);
        const meta = withChapterSummary(state.meta, chapter);
        projectRef.current = { path: state.path, meta };
        setProject(projectRef.current);
        setRecovery((current) => current.filter((item) => item.chapterId !== chapterId));
        setWarnings((current) => [...current, result.warning ?? '已恢复草稿']);
        return true;
      } catch (recoveryError) {
        setError(errorMessage(recoveryError));
        return false;
      }
    },
    [],
  );

  const discardRecoveryDraft = useCallback(async (chapterId: string): Promise<boolean> => {
    const state = projectRef.current;
    if (!state) return false;
    try {
      await projectApi.discardRecovery(state.path, chapterId);
      setRecovery((current) => current.filter((item) => item.chapterId !== chapterId));
      return true;
    } catch (discardError) {
      setError(errorMessage(discardError));
      return false;
    }
  }, []);

  const dismissWarning = useCallback((index: number) => {
    setWarnings((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const clearError = useCallback(() => setError(''), []);

  useEffect(() => {
    if (!projectApi.isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let appWindow: ReturnType<typeof getCurrentWindow>;
    try {
      appWindow = getCurrentWindow();
    } catch {
      return;
    }
    if (typeof appWindow.onCloseRequested !== 'function') return;
    void appWindow
      .onCloseRequested(async (event) => {
        if (closeRequestedRef.current) return;
        event.preventDefault();
        closeRequestedRef.current = true;
        const closed = await closeProject();
        if (closed) {
          await appWindow.destroy();
        } else {
          closeRequestedRef.current = false;
        }
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [closeProject]);

  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current) void saveChapterNow('beforeunload');
      void savePreferencesNow();
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [saveChapterNow, savePreferencesNow]);

  useEffect(() => {
    return () => {
      clearSaveTimer();
      clearMetaTimer();
    };
  }, [clearMetaTimer, clearSaveTimer]);

  const activeIndex = Math.max(
    0,
    project?.meta.chapters.findIndex((chapter) => chapter.id === activeChapter?.id) ?? 0,
  );

  return {
    recent,
    project: project?.meta ?? null,
    projectPath: project?.path ?? null,
    chapters: project?.meta.chapters ?? [],
    activeChapter,
    activeIndex,
    documentRevision,
    loading,
    saving,
    savedAt,
    dirty,
    error,
    warnings,
    recovery,
    createProject,
    openProject,
    openRecent,
    closeProject,
    importLegacy,
    selectChapter,
    updateActiveChapter,
    addChapter: createChapter,
    renameChapter,
    moveChapter,
    deleteChapter,
    saveNow,
    updateAppearance,
    updateSettings,
    history,
    restoreHistory,
    restoreRecovery,
    discardRecovery: discardRecoveryDraft,
    dismissWarning,
    clearError,
  };
}

export type ProjectController = ReturnType<typeof useProject>;
