import { useCallback, useEffect, useState } from 'react';
import type { Chapter, WritingSettings, WorkspaceSnapshot } from '../types';
import { createChapter, loadWorkspace, saveWorkspace } from '../lib/workspace';

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(() => loadWorkspace());
  const [savedAt, setSavedAt] = useState(() => Date.now());

  useEffect(() => {
    saveWorkspace(snapshot);
    setSavedAt(Date.now());
  }, [snapshot]);

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

  const updateActiveChapter = useCallback((patch: Partial<Pick<Chapter, 'title' | 'content'>>) => {
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
    saveWorkspace(snapshot);
    setSavedAt(Date.now());
  }, [snapshot]);

  return {
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
