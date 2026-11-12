import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter, WritingSettings, WorkspaceSnapshot } from '../types';
import { createChapter, loadWorkspace, saveWorkspace } from '../lib/workspace';

type ChapterPatch = Partial<Pick<Chapter, 'title' | 'content' | 'characterCount' | 'excerpt'>>;

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(() => loadWorkspace());
  const [savedAt, setSavedAt] = useState(() => Date.now());
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Debounced persistence keeps long HTML documents from hitting localStorage on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveWorkspace(snapshot);
      setSavedAt(Date.now());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  useEffect(() => {
    const flush = () => saveWorkspace(snapshotRef.current);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const activeChapter =
    snapshot.chapters.find((chapter) => chapter.id === snapshot.activeId) ?? snapshot.chapters[0];

  const activeIndex = Math.max(
    0,
    snapshot.chapters.findIndex((chapter) => chapter.id === activeChapter.id),
  );

  const selectChapter = useCallback((id: string) => {
    setSnapshot((current) =>
      current.chapters.some((chapter) => chapter.id === id)
        ? { ...current, activeId: id }
        : current,
    );
  }, []);

  const addChapter = useCallback(() => {
    setSnapshot((current) => {
      const chapter = createChapter(current.chapters.length + 1);
      return {
        ...current,
        chapters: [...current.chapters, chapter],
        activeId: chapter.id,
      };
    });
  }, []);

  const updateActiveChapter = useCallback((patch: ChapterPatch) => {
    setSnapshot((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === current.activeId
          ? { ...chapter, ...patch, updatedAt: Date.now() }
          : chapter,
      ),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<WritingSettings>) => {
    setSnapshot((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  }, []);

  const saveNow = useCallback(() => {
    saveWorkspace(snapshotRef.current);
    setSavedAt(Date.now());
  }, []);

  return {
    projectId: snapshot.projectId,
    chapters: snapshot.chapters,
    activeChapter,
    activeIndex,
    settings: snapshot.settings,
    savedAt,
    selectChapter,
    addChapter,
    updateActiveChapter,
    updateSettings,
    saveNow,
  };
}
