import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BackgroundStyle,
  EnvironmentPreset,
  ProjectAppearance,
  SavedTheme,
} from '../types';
import {
  applyEnvironmentPreset,
  createBackgroundPreset,
  createEnvironmentFromAppearance,
  createSavedTheme,
  createThemeId,
  deleteBackgroundImage,
  exportEnvironmentPreset,
  importEnvironmentPreset,
  loadEnvironmentPresets,
  loadSavedThemes,
  prepareBackgroundImage,
  putBackgroundImage,
  saveEnvironmentPresets,
  saveSavedThemes,
} from './storage';
import { OFFICIAL_ENVIRONMENTS } from './environmentPresets';
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
  const [environmentPresets, setEnvironmentPresets] = useState<EnvironmentPreset[]>(() =>
    loadEnvironmentPresets(),
  );
  const themesRef = useRef(savedThemes);
  const environmentsRef = useRef(environmentPresets);
  const appearanceRef = useRef(appearance);
  themesRef.current = savedThemes;
  environmentsRef.current = environmentPresets;
  appearanceRef.current = appearance;

  useEffect(() => {
    const timer = window.setTimeout(() => saveSavedThemes(savedThemes), 300);
    return () => window.clearTimeout(timer);
  }, [savedThemes]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveEnvironmentPresets(environmentPresets), 300);
    return () => window.clearTimeout(timer);
  }, [environmentPresets]);

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
    (readingOpacity: number) =>
      onChange({
        ...appearance,
        readingOpacity,
        immersive: { ...appearance.immersive, opacity: readingOpacity },
      }),
    [appearance, onChange],
  );

  const updatePaper = useCallback(
    (patch: Partial<ProjectAppearance['paper']>) => {
      const key = appearance.mode === 'immersive' ? 'immersive' : 'paper';
      onChange({
        ...appearance,
        [key]: { ...appearance[key], ...patch },
      });
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
        immersive: theme.immersive
          ? { ...theme.immersive, customMargins: { ...theme.immersive.customMargins } }
          : appearance.immersive,
        uiTheme: theme.uiTheme ?? appearance.uiTheme,
        uiColors: theme.uiColors ? { ...theme.uiColors } : appearance.uiColors,
        display: theme.display ? { ...theme.display } : appearance.display,
        animation: theme.animation ? { ...theme.animation } : appearance.animation,
      });
    },
    [appearance, onChange],
  );

  const saveCurrentTheme = useCallback((name: string): SavedTheme => {    const theme = createSavedTheme(name, appearanceRef.current);
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

  const applyEnvironment = useCallback(
    (preset: EnvironmentPreset) => {
      onChange(applyEnvironmentPreset(appearanceRef.current, preset));
    },
    [onChange],
  );

  const saveCurrentEnvironment = useCallback(
    (name: string): EnvironmentPreset => {
      const preset = createEnvironmentFromAppearance(name, appearanceRef.current);
      setEnvironmentPresets((current) => [preset, ...current]);
      onChange({ ...appearanceRef.current, presetId: preset.id });
      return preset;
    },
    [onChange],
  );

  const renameEnvironment = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setEnvironmentPresets((current) =>
      current.map((preset) => (preset.id === id ? { ...preset, name: trimmed } : preset)),
    );
  }, []);

  const deleteEnvironment = useCallback((id: string) => {
    setEnvironmentPresets((current) => current.filter((preset) => preset.id !== id));
    if (appearanceRef.current.presetId === id) {
      onChange({ ...appearanceRef.current, presetId: 'legacy' });
    }
  }, [onChange]);

  const duplicateEnvironment = useCallback((preset: EnvironmentPreset): EnvironmentPreset => {
    const copy: EnvironmentPreset = {
      ...preset,
      id: createThemeId(),
      name: `${preset.name} 副本`,
      presetType: 'custom',
      background: { ...preset.background },
      paper: { ...preset.paper, customMargins: { ...preset.paper.customMargins } },
      immersive: { ...preset.immersive, customMargins: { ...preset.immersive.customMargins } },
      uiColors: { ...preset.uiColors },
      display: { ...preset.display },
      animation: { ...preset.animation },
      resourceReferences: [...preset.resourceReferences],
    };
    setEnvironmentPresets((current) => [copy, ...current]);
    return copy;
  }, []);

  const exportEnvironment = useCallback((id: string): string | null => {
    const preset = environmentsRef.current.find((item) => item.id === id);
    return preset ? exportEnvironmentPreset(preset) : null;
  }, []);

  const importEnvironment = useCallback((text: string): EnvironmentPreset => {
    const preset = importEnvironmentPreset(text);
    setEnvironmentPresets((current) => [preset, ...current]);
    return preset;
  }, []);

  const restoreDefaultEnvironment = useCallback(() => {
    const origin = OFFICIAL_ENVIRONMENTS[0];
    if (origin) applyEnvironment(origin);
  }, [applyEnvironment]);

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
    environmentPresets,
    backgroundUrl,
    setMode,
    updateBackground,
    setReadingOpacity,
    updatePaper,
    applyPreset,
    applySavedTheme,
    applyEnvironment,
    saveCurrentEnvironment,
    renameEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    exportEnvironment,
    importEnvironment,
    restoreDefaultEnvironment,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
  };
}
