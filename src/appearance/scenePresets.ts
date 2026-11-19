import type { CSSProperties } from 'react';
import type { EnvironmentAnimationSettings } from '../types';

export interface AnimationScenePreset {
  id: string;
  name: string;
  description: string;
  type: string;
  colors: [string, string, string];
  accent: string;
  settings: Partial<EnvironmentAnimationSettings>;
}

export const ANIMATION_SCENE_PRESETS: AnimationScenePreset[] = [
  {
    id: 'flow',
    name: '流动渐变',
    description: '蓝、青与薄荷绿缓慢融合',
    type: 'flow',
    colors: ['#123B5C', '#2E7FA3', '#A5D9C3'],
    accent: '#8FE0CE',
    settings: { enabled: true, type: 'flow', sceneId: 'flow', speed: 0.9, intensity: 0.7 },
  },
  {
    id: 'breathe',
    name: '呼吸光',
    description: '低亮度光源周期性呼吸',
    type: 'breathe',
    colors: ['#292724', '#5A5042', '#D7B679'],
    accent: '#E8CE98',
    settings: { enabled: true, type: 'breathe', sceneId: 'breathe', speed: 0.8, intensity: 0.72 },
  },
  {
    id: 'orbs',
    name: '浮动光斑',
    description: '不同景深的柔光缓慢漂移',
    type: 'orbs',
    colors: ['#303746', '#687793', '#CDBDD8'],
    accent: '#E4D5EE',
    settings: { enabled: true, type: 'orbs', sceneId: 'orbs', speed: 0.75, intensity: 0.62 },
  },
  {
    id: 'aurora',
    name: '极光',
    description: '深蓝夜幕中的青绿与紫色极光',
    type: 'aurora',
    colors: ['#07172B', '#0D4F5B', '#4A427D'],
    accent: '#66D6B3',
    settings: { enabled: true, type: 'aurora', sceneId: 'aurora', speed: 0.8, intensity: 0.78 },
  },
  {
    id: 'rain-traffic',
    name: '雨夜车流',
    description: '城市灯光、车灯与玻璃雨滴',
    type: 'rain-traffic',
    colors: ['#091522', '#243746', '#536A78'],
    accent: '#F3C68F',
    settings: {
      enabled: true,
      type: 'rain-traffic',
      sceneId: 'rain-traffic',
      speed: 1,
      intensity: 0.72,
      rainDensity: 0.65,
      rainFallSpeed: 0.65,
      trafficDensity: 0.55,
      trafficSpeed: 0.55,
      lightBrightness: 0.68,
      backgroundBrightness: 0.9,
      blurAmount: 9,
    },
  },
  {
    id: 'snow',
    name: '冬夜飘雪',
    description: '深蓝冬夜或浅灰蓝雪日',
    type: 'snow',
    colors: ['#AFC9DC', '#DDEAF2', '#F7FBFF'],
    accent: '#FFE0B0',
    settings: {
      enabled: true,
      type: 'snow',
      sceneId: 'snow',
      speed: 0.75,
      intensity: 0.72,
      snowDensity: 0.65,
      snowWind: 0.16,
      snowNight: false,
    },
  },
];

export function scenePresetMatches(
  animation: EnvironmentAnimationSettings,
  preset: AnimationScenePreset,
): boolean {
  if (!animation.enabled) return false;
  if (animation.sceneId) return animation.sceneId === preset.id;
  return animation.type === preset.type;
}

export function applyAnimationScene(
  animation: EnvironmentAnimationSettings,
  preset: AnimationScenePreset,
): EnvironmentAnimationSettings {
  return { ...animation, ...preset.settings };
}

export function sceneThumbnailStyle(preset: AnimationScenePreset): CSSProperties {
  return {
    backgroundImage: `radial-gradient(circle at 72% 24%, ${preset.accent}66 0%, transparent 34%), linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 52%, ${preset.colors[2]} 100%)`,
  };
}
