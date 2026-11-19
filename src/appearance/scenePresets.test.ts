import { describe, expect, it } from 'vitest';
import {
  ANIMATION_SCENE_PRESETS,
  applyAnimationScene,
  scenePresetMatches,
} from './scenePresets';
import { DEFAULT_ANIMATION } from './environmentPresets';

describe('animation scene presets', () => {
  it('provides six independent background scenes', () => {
    expect(ANIMATION_SCENE_PRESETS.map((scene) => scene.id)).toEqual([
      'flow',
      'breathe',
      'orbs',
      'aurora',
      'rain-traffic',
      'snow',
    ]);
  });

  it('applies a complete scene with its own colors and parameters', () => {
    const rain = ANIMATION_SCENE_PRESETS.find((scene) => scene.id === 'rain-traffic')!;
    const applied = applyAnimationScene(DEFAULT_ANIMATION, rain);
    expect(applied.enabled).toBe(true);
    expect(applied.type).toBe('rain-traffic');
    expect(applied.sceneId).toBe('rain-traffic');
    expect(applied.rainDensity).toBe(0.65);
    expect(rain.colors[0]).toBe('#091522');
  });

  it('supports snow day and night through the same scene', () => {
    const snow = ANIMATION_SCENE_PRESETS.find((scene) => scene.id === 'snow')!;
    const day = applyAnimationScene(DEFAULT_ANIMATION, snow);
    expect(scenePresetMatches(day, snow)).toBe(true);
    const night = { ...day, snowNight: true };
    expect(scenePresetMatches(night, snow)).toBe(true);
  });
});
