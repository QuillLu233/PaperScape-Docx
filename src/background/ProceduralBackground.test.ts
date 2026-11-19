import { describe, expect, it, vi } from 'vitest';
import { drawProceduralFrame } from './ProceduralBackground';
import { DEFAULT_ANIMATION, DEFAULT_BACKGROUND } from '../appearance/environmentPresets';
import type { BackgroundStyle, EnvironmentAnimationSettings } from '../types';

function createContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    set fillStyle(_value: string) {},
    set strokeStyle(_value: string) {},
    set lineWidth(_value: number) {},
    set globalAlpha(_value: number) {},
    set globalCompositeOperation(_value: string) {},
  } as unknown as CanvasRenderingContext2D;
}

const background: BackgroundStyle = {
  ...DEFAULT_BACKGROUND,
  gradientFrom: '#10182F',
  gradientMid: '#287B91',
  gradientTo: '#648AB9',
  gradientAccent: '#F1D5A0',
};

function settings(type: string): EnvironmentAnimationSettings {
  return {
    ...DEFAULT_ANIMATION,
    enabled: true,
    type,
    speed: 1,
    intensity: 0.6,
    rainDensity: 0.6,
    trafficDensity: 0.5,
    trafficSpeed: 0.6,
    snowDensity: 0.6,
    snowWind: 0.2,
  };
}

describe('procedural background renderer', () => {
  for (const type of ['flow', 'breathe', 'orbs', 'aurora', 'rain-traffic', 'snow']) {
    it(`draws ${type} without throwing`, () => {
      const ctx = createContext();
      expect(() => drawProceduralFrame(ctx, 800, 600, 1.2, background, settings(type))).not.toThrow();
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  }

  it('keeps the static type transparent after clearing', () => {
    const ctx = createContext();
    drawProceduralFrame(ctx, 800, 600, 1.2, background, settings('none'));
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
