import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackgroundStyle, ProjectAppearance, SavedTheme } from '../types';
import {
  createBackgroundPreset,
  createSavedTheme,
  createThemeId,
  deleteBackgroundImage,
  loadSavedThemes,
  prepareBackgroundImage,
  putBackgroundImage,
  saveSavedThemes,
} from './storage';
import { releaseBackgroundUrl, useBackgroundImageUrl } from './useBackgroundImage';

/**
 * Project appearance is persisted in project.json. This controller only owns
 * the reusable global theme library and image object URLs.
 */
export function useProjectAppearance(
  appearance: ProjectAppearance,
  onChange: (next: ProjectAppearance) => void,
) {
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => loadSavedThemes());
  const themesRef = useRef(savedThemes);
  const appearanceRef = useRef(appearance);
  themesRef.current = savedThemes;
  appearanceRef.current = appearance;

  useEffect(() => {
    const timer = window.setTimeout(() => saveSavedThemes(savedThemes), 300);
    return () => window.clearTimeout(timer);
  }, [savedThemes]);

  const backgroundUrl = useBackgroundImageUrl(appearance.background.imageId);

  const updateBackground = useCallback(
    (patch: Partial<BackgroundStyle>) => {
      onChange({ ...appearance, background: { ...appearance.background, ...patch } });
    },
    [appearance, onChange],
  );

  const setMode = useCallback(
    (mode: ProjectAppearance['mode']) => onChange({ ...appearance, mode }),
    [appearance, onChange],
  );

  const setReadingOpacity = useCallback(
    (readingOpacity: number) => onChange({ ...appearance, readingOpacity }),
    [appearance, onChange],
  );

  const updatePaper = useCallback(
    (patch: Partial<ProjectAppearance['paper']>) => {
      onChange({ ...appearance, paper: { ...appearance.paper, ...patch } });
    },
    [appearance, onChange],
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      onChange({ ...appearance, background: createBackgroundPreset(presetId) });
    },
    [appearance, onChange],
  );

  const applySavedTheme = useCallback(
    (theme: SavedTheme) => {
      onChange({
        ...appearance,
        background: { ...theme.background, presetId: theme.id, name: theme.name },
        readingOpacity: theme.readingOpacity,
        paper: { ...theme.paper, customMargins: { ...theme.paper.customMargins } },
      });
    },
    [appearance, onChange],
  );

  const saveCurrentTheme = useCallback((name: string): SavedTheme => {
    const theme = createSavedTheme(name, appearanceRef.current);
    setSavedThemes((current) => [theme, ...current.filter((item) => item.name !== theme.name)]);
    onChange({
      ...appearanceRef.current,
      background: {
        ...appearanceRef.current.background,
        presetId: theme.id,
        name: theme.name,
      },
    });
    return theme;
  }, [onChange]);

  const deleteSavedTheme = useCallback(
    (id: string) => {
      setSavedThemes((current) => {
        const removed = current.find((theme) => theme.id === id);
        const next = current.filter((theme) => theme.id !== id);
        if (removed?.background.imageId) {
          const imageId = removed.background.imageId;
          const stillUsed =
            appearanceRef.current.background.imageId === imageId ||
            next.some((theme) => theme.background.imageId === imageId);
          if (!stillUsed) {
            releaseBackgroundUrl(imageId);
            void deleteBackgroundImage(imageId).catch(() => undefined);
          }
        }
        return next;
      });
    },
    [],
  );

  const setBackgroundFromFile = useCallback(
    async (file: File) => {
      const blob = await prepareBackgroundImage(file);
      const imageId = createThemeId();
      await putBackgroundImage(imageId, blob);
      const previousImage = appearanceRef.current.background.imageId;
      onChange({
        ...appearanceRef.current,
        background: {
          ...appearanceRef.current.background,
          kind: 'image',
          imageId,
          presetId: 'custom-image',
          name: file.name.replace(/\.[^.]+$/, '') || '自定义图片',
        },
      });
      if (
        previousImage &&
        previousImage !== imageId &&
        !themesRef.current.some((theme) => theme.background.imageId === previousImage)
      ) {
        releaseBackgroundUrl(previousImage);
        void deleteBackgroundImage(previousImage).catch(() => undefined);
      }
    },
    [onChange],
  );

  return {
    savedThemes,
    backgroundUrl,
    setMode,
    updateBackground,
    setReadingOpacity,
    updatePaper,
    applyPreset,
    applySavedTheme,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
  };
}
