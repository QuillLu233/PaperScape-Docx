import { describe, expect, it } from 'vitest';
import {
  ANIMATION_SCENE_PRESETS,
  applyAnimationScene,
  scenePresetMatches,
} from './scenePresets';
import { DEFAULT_ANIMATION } from './environmentPresets';

describe('animation scene presets', () => {
  it('provides the five separate scene presets', () => {
    expect(ANIMATION_SCENE_PRESETS.map((scene) => scene.id)).toEqual([
      'breathe',
      'flow',
      'rain-traffic',
      'snow-day',
      'snow-night',
    ]);
  });

  it('applies a scene without touching environment or paper settings', () => {
    const rain = ANIMATION_SCENE_PRESETS.find((scene) => scene.id === 'rain-traffic')!;
    const applied = applyAnimationScene(DEFAULT_ANIMATION, rain);
    expect(applied.enabled).toBe(true);
    expect(applied.type).toBe('rain-traffic');
    expect(applied.rainDensity).toBe(0.65);
    expect(applied.trafficDensity).toBe(0.55);
  });

  it('distinguishes day and night snow presets', () => {
    const day = ANIMATION_SCENE_PRESETS.find((scene) => scene.id === 'snow-day')!;
    const night = ANIMATION_SCENE_PRESETS.find((scene) => scene.id === 'snow-night')!;
    const dayState = applyAnimationScene(DEFAULT_ANIMATION, day);
    const nightState = applyAnimationScene(DEFAULT_ANIMATION, night);
    expect(scenePresetMatches(dayState, day)).toBe(true);
    expect(scenePresetMatches(dayState, night)).toBe(false);
    expect(scenePresetMatches(nightState, night)).toBe(true);
    expect(scenePresetMatches(nightState, day)).toBe(false);
  });
});
