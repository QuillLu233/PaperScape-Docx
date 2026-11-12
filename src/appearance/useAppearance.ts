import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackgroundStyle, ProjectAppearance, SavedTheme } from '../types';
import {
  createBackgroundPreset,
  createSavedTheme,
  deleteBackgroundImage,
  loadProjectAppearance,
  loadSavedThemes,
  prepareBackgroundImage,
  putBackgroundImage,
  sanitizeAppearance,
  saveProjectAppearance,
  saveSavedThemes,
} from './storage';
import { createThemeId } from './storage';
import { useBackgroundImageUrl, releaseBackgroundUrl } from './useBackgroundImage';

export function useAppearance(projectId: string) {
  const [appearance, setAppearance] = useState<ProjectAppearance>(() =>
    loadProjectAppearance(projectId),
  );
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => loadSavedThemes());
  const appearanceRef = useRef(appearance);
  const themesRef = useRef(savedThemes);
  appearanceRef.current = appearance;
  themesRef.current = savedThemes;

  useEffect(() => {
    const next = loadProjectAppearance(projectId);
    setAppearance(next);
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveProjectAppearance(projectId, appearance), 300);
    return () => window.clearTimeout(timer);
  }, [appearance, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveSavedThemes(savedThemes), 300);
    return () => window.clearTimeout(timer);
  }, [savedThemes]);

  useEffect(() => {
    const flush = () => {
      saveProjectAppearance(projectId, appearanceRef.current);
      saveSavedThemes(themesRef.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [projectId]);

  const backgroundUrl = useBackgroundImageUrl(appearance.background.imageId);

  const setMode = useCallback((mode: ProjectAppearance['mode']) => {
    setAppearance((current) => ({ ...current, mode }));
  }, []);

  const updateBackground = useCallback((patch: Partial<BackgroundStyle>) => {
    setAppearance((current) => ({
      ...current,
      background: { ...current.background, ...patch },
    }));
  }, []);

  const updatePaper = useCallback((patch: Partial<ProjectAppearance['paper']>) => {
    setAppearance((current) => ({
      ...current,
      paper: { ...current.paper, ...patch },
    }));
  }, []);

  const setReadingOpacity = useCallback((readingOpacity: number) => {
    setAppearance((current) => ({ ...current, readingOpacity }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    setAppearance((current) => ({
      ...current,
      background: createBackgroundPreset(presetId),
    }));
  }, []);

  const applySavedTheme = useCallback((theme: SavedTheme) => {
    setAppearance((current) => ({
      ...current,
      background: { ...theme.background, presetId: theme.id, name: theme.name },
      readingOpacity: theme.readingOpacity,
      paper: { ...theme.paper, customMargins: { ...theme.paper.customMargins } },
    }));
  }, []);

  const saveCurrentTheme = useCallback(
    (name: string): SavedTheme => {
      const theme = createSavedTheme(name, appearanceRef.current);
      setSavedThemes((current) => [theme, ...current.filter((item) => item.name !== theme.name)]);
      setAppearance((current) => ({
        ...current,
        background: { ...current.background, presetId: theme.id, name: theme.name },
      }));
      return theme;
    },
    [],
  );

  const deleteSavedTheme = useCallback((id: string) => {
    setSavedThemes((current) => {
      const removed = current.find((theme) => theme.id === id);
      const next = current.filter((theme) => theme.id !== id);
      if (removed) {
        const imageId = removed.background.imageId;
        const stillUsed =
          imageId &&
          (appearanceRef.current.background.imageId === imageId ||
            next.some((theme) => theme.background.imageId === imageId));
        if (imageId && !stillUsed) {
          releaseBackgroundUrl(imageId);
          void deleteBackgroundImage(imageId).catch(() => undefined);
        }
      }
      return next;
    });
    setAppearance((current) =>
      current.background.presetId === id
        ? { ...current, background: { ...current.background, presetId: 'custom' } }
        : current,
    );
  }, []);

  const setBackgroundFromFile = useCallback(async (file: File) => {
    const blob = await prepareBackgroundImage(file);
    const imageId = createThemeId();
    await putBackgroundImage(imageId, blob);
    const previousImage = appearanceRef.current.background.imageId;
    setAppearance((current) => ({
      ...current,
      background: {
        ...current.background,
        kind: 'image',
        imageId,
        presetId: 'custom-image',
        name: file.name.replace(/\.[^.]+$/, '') || '自定义图片',
      },
    }));
    if (
      previousImage &&
      previousImage !== imageId &&
      !themesRef.current.some((theme) => theme.background.imageId === previousImage)
    ) {
      releaseBackgroundUrl(previousImage);
      void deleteBackgroundImage(previousImage).catch(() => undefined);
    }
  }, []);

  const applyAppearance = useCallback((next: ProjectAppearance) => {
    setAppearance(sanitizeAppearance(next));
  }, []);

  return {
    appearance,
    backgroundUrl,
    savedThemes,
    setMode,
    updateBackground,
    updatePaper,
    setReadingOpacity,
    applyPreset,
    applySavedTheme,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
    applyAppearance,
  };
}
