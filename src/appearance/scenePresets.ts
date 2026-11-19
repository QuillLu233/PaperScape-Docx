import type { EnvironmentAnimationSettings } from '../types';

export interface AnimationScenePreset {
  id: string;
  name: string;
  description: string;
  type: string;
  settings: Partial<EnvironmentAnimationSettings>;
}

export const ANIMATION_SCENE_PRESETS: AnimationScenePreset[] = [
  {
    id: 'breathe',
    name: '呼吸光',
    description: '缓慢明暗的柔和光晕',
    type: 'breathe',
    settings: { enabled: true, type: 'breathe', speed: 0.8, intensity: 0.65 },
  },
  {
    id: 'flow',
    name: '渐变',
    description: '多色缓慢融合',
    type: 'flow',
    settings: { enabled: true, type: 'flow', speed: 0.9, intensity: 0.65 },
  },
  {
    id: 'rain-traffic',
    name: '雨夜车灯',
    description: '雨滴、车灯与城市光斑',
    type: 'rain-traffic',
    settings: {
      enabled: true,
      type: 'rain-traffic',
      speed: 1,
      intensity: 0.7,
      rainDensity: 0.65,
      trafficDensity: 0.55,
      trafficSpeed: 0.55,
      blurAmount: 9,
    },
  },
  {
    id: 'snow-day',
    name: '冬雪 · 日间',
    description: '冰蓝白昼与缓慢飘雪',
    type: 'snow',
    settings: {
      enabled: true,
      type: 'snow',
      speed: 0.75,
      intensity: 0.7,
      snowDensity: 0.65,
      snowWind: 0.18,
      snowNight: false,
    },
  },
  {
    id: 'snow-night',
    name: '冬雪 · 夜间',
    description: '深蓝夜色与暖色远灯',
    type: 'snow',
    settings: {
      enabled: true,
      type: 'snow',
      speed: 0.7,
      intensity: 0.72,
      snowDensity: 0.65,
      snowWind: 0.12,
      snowNight: true,
    },
  },
];

export function scenePresetMatches(
  animation: EnvironmentAnimationSettings,
  preset: AnimationScenePreset,
): boolean {
  if (!animation.enabled) return false;
  if (preset.type !== 'snow') return animation.type === preset.type;
  return animation.type === 'snow' && Boolean(animation.snowNight) === Boolean(preset.settings.snowNight);
}

export function applyAnimationScene(
  animation: EnvironmentAnimationSettings,
  preset: AnimationScenePreset,
): EnvironmentAnimationSettings {
  return { ...animation, ...preset.settings };
}
