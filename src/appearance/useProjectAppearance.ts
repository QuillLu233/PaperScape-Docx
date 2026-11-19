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
  prepareBackgroundVideo,
  putBackgroundImage,
  putBackgroundVideo,
  saveEnvironmentPresets,
  saveSavedThemes,
  deleteBackgroundVideo,
} from './storage';
import { OFFICIAL_ENVIRONMENTS } from './environmentPresets';
import { releaseBackgroundUrl, useBackgroundImageUrl } from './useBackgroundImage';
import {
  registerVideoObjectUrl,
  releaseVideoUrl,
  useBackgroundVideoUrl,
} from './useBackgroundVideo';

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
  const backgroundVideoUrl = useBackgroundVideoUrl(appearance.background.videoId);

  const discardVideo = useCallback((videoId: string | null | undefined) => {
    if (!videoId) return;
    releaseVideoUrl(videoId);
    void deleteBackgroundVideo(videoId).catch(() => undefined);
  }, []);

  const updateBackground = useCallback(
    (patch: Partial<BackgroundStyle>) => {
      const previousVideo =
        appearance.background.kind === 'video' ? appearance.background.videoId : null;
      if (patch.kind && patch.kind !== 'video' && previousVideo) {
        releaseVideoUrl(previousVideo);
        void deleteBackgroundVideo(previousVideo).catch(() => undefined);
      }
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
      if (appearance.background.kind === 'video') {
        discardVideo(appearance.background.videoId);
      }
      onChange({ ...appearance, background: createBackgroundPreset(presetId) });
    },
    [appearance, discardVideo, onChange],
  );

  const applySavedTheme = useCallback(
    (theme: SavedTheme) => {
      if (appearance.background.kind === 'video' && theme.background.kind !== 'video') {
        discardVideo(appearance.background.videoId);
      }
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
    [appearance, discardVideo, onChange],
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
      if (appearanceRef.current.background.kind === 'video' && preset.background.kind !== 'video') {
        discardVideo(appearanceRef.current.background.videoId);
      }
      onChange(applyEnvironmentPreset(appearanceRef.current, preset));
    },
    [discardVideo, onChange],
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
      const previousVideo =
        appearanceRef.current.background.kind === 'video'
          ? appearanceRef.current.background.videoId
          : null;
      onChange({
        ...appearanceRef.current,
        background: {
          ...appearanceRef.current.background,
          kind: 'image',
          source: 'static',
          imageId,
          videoId: null,
          presetId: 'custom-image',
          name: file.name.replace(/\.[^.]+$/, '') || '自定义图片',
        },
      });
      if (previousVideo) {
        releaseVideoUrl(previousVideo);
        void deleteBackgroundVideo(previousVideo).catch(() => undefined);
      }
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

  const setBackgroundFromVideo = useCallback(
    async (file: File, mode: 'reference' | 'copy') => {
      const blob = await prepareBackgroundVideo(file);
      const videoId = createThemeId();
      const previousVideo = appearanceRef.current.background.videoId;
      if (mode === 'copy') {
        await putBackgroundVideo(videoId, blob);
      } else {
        registerVideoObjectUrl(videoId, URL.createObjectURL(blob));
      }
      onChange({
        ...appearanceRef.current,
        background: {
          ...appearanceRef.current.background,
          kind: 'video',
          source: 'video',
          videoId,
          videoName: file.name,
          videoFit: 'cover',
          videoMode: mode,
          videoPaused: false,
          presetId: 'custom-video',
          name: file.name.replace(/\.[^.]+$/, '') || '外部视频背景',
        },
      });
      if (previousVideo && previousVideo !== videoId) {
        releaseVideoUrl(previousVideo);
        void deleteBackgroundVideo(previousVideo).catch(() => undefined);
      }
    },
    [onChange],
  );

  const toggleBackgroundVideo = useCallback(() => {
    const background = appearanceRef.current.background;
    if (background.kind !== 'video') return;
    onChange({
      ...appearanceRef.current,
      background: { ...background, videoPaused: !background.videoPaused },
    });
  }, [onChange]);

  return {
    savedThemes,
    environmentPresets,
    backgroundUrl,
    backgroundVideoUrl,
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
    setBackgroundFromVideo,
    toggleBackgroundVideo,
  };
}
