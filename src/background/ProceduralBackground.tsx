import { useEffect, useRef } from 'react';
import type { BackgroundStyle, EnvironmentAnimationSettings } from '../types';

interface ProceduralBackgroundProps {
  background: BackgroundStyle;
  animation: EnvironmentAnimationSettings;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '888888';
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.45, rgba(color, alpha * 0.55));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function smooth(time: number, phase = 0): number {
  return (Math.sin(time + phase) + 1) / 2;
}

function drawFlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  colors: string[],
  intensity: number,
): void {
  ctx.globalCompositeOperation = 'source-over';
  const spans = [
    { x: width * 0.22, y: height * 0.32, r: width * 0.55 },
    { x: width * 0.78, y: height * 0.64, r: width * 0.5 },
    { x: width * 0.48, y: height * 0.18, r: width * 0.42 },
  ];
  spans.forEach((span, index) => {
    const x = span.x + Math.sin(time * 0.12 + index * 1.7) * width * 0.12;
    const y = span.y + Math.cos(time * 0.09 + index) * height * 0.1;
    blob(ctx, x, y, span.r, colors[index % colors.length], 0.2 * intensity);
  });
}

function drawBreathe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  colors: string[],
  intensity: number,
): void {
  const pulse = 0.75 + smooth(time * 0.6) * 0.25;
  blob(
    ctx,
    width * 0.5,
    height * 0.4,
    Math.min(width, height) * 0.65 * pulse,
    colors[0],
    0.26 * intensity,
  );
  ctx.globalCompositeOperation = 'lighter';
  blob(ctx, width * 0.35, height * 0.65, width * 0.3, colors[1], 0.12 * intensity);
}

function drawOrbs(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  colors: string[],
  intensity: number,
): void {
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 7; index += 1) {
    const phase = index * 1.31;
    const x =
      width * (0.12 + ((index * 0.157) % 0.76)) +
      Math.sin(time * 0.16 + phase) * width * 0.08;
    const y =
      height * (0.18 + ((index * 0.213) % 0.64)) +
      Math.cos(time * 0.12 + phase) * height * 0.08;
    const radius = (34 + (index % 4) * 26) * (0.8 + smooth(time * 0.3, phase) * 0.35);
    blob(ctx, x, y, radius, colors[index % colors.length], 0.16 * intensity);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawAurora(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  colors: string[],
  intensity: number,
): void {
  ctx.globalCompositeOperation = 'lighter';
  const auroraColors = [...colors, '#4F86D8', '#43B9C9', '#7ED6A7', '#B49AE8'];
  auroraColors.slice(0, 4).forEach((color, index) => {
    const x = width * (0.24 + index * 0.2) + Math.sin(time * 0.1 + index) * width * 0.12;
    const y = height * (0.22 + Math.sin(time * 0.07 + index * 1.4) * 0.08);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.28 + Math.sin(time * 0.08 + index) * 0.12);
    ctx.scale(1.8, 0.55);
    blob(ctx, 0, 0, width * 0.32, color, 0.18 * intensity);
    ctx.restore();
  });
  ctx.globalCompositeOperation = 'source-over';
}

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

function seedDrop(index: number, width: number, height: number): Drop {
  const seed = (index * 9301 + 49297) % 233280;
  const random = seed / 233280;
  return {
    x: random * width,
    y: ((seed * 7) % 1000) / 1000 * height,
    length: 14 + ((seed * 13) % 30),
    speed: 90 + ((seed * 17) % 160),
    alpha: 0.12 + ((seed * 11) % 30) / 100,
  };
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  animation: EnvironmentAnimationSettings,
  intensity: number,
): void {
  ctx.fillStyle = 'rgba(7, 14, 24, 0.62)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  const density = animation.rainDensity ?? 0.55;
  const dropCount = Math.round(50 + density * 120);
  ctx.strokeStyle = 'rgba(190, 220, 245, 0.32)';
  ctx.lineWidth = 1;
  for (let index = 0; index < dropCount; index += 1) {
    const drop = seedDrop(index, width, height);
    const travel = (drop.y + time * drop.speed) % (height + 80);
    const x = (drop.x + travel * 0.08) % width;
    ctx.globalAlpha = drop.alpha * (0.7 + intensity * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, travel);
    ctx.lineTo(x - 2, travel + drop.length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const traffic = animation.trafficDensity ?? 0.5;
  const lightCount = Math.round(5 + traffic * 10);
  for (let index = 0; index < lightCount; index += 1) {
    const warm = index % 3 !== 0;
    const y = height * (0.6 + ((index * 0.047) % 0.26));
    const speed = (18 + (index % 4) * 8) * (animation.trafficSpeed ?? 0.55);
    const direction = index % 2 === 0 ? 1 : -1;
    const x = ((time * speed * direction + index * 167) % (width + 300)) - 150;
    const color = warm ? '#FFE6B8' : '#FF6A72';
    ctx.fillStyle = rgba(color, warm ? 0.3 : 0.22);
    ctx.beginPath();
    ctx.ellipse(x, y, 22 + (index % 5) * 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(color, 0.07);
    ctx.fillRect(x - 4, y, 8, height * 0.14);
  }

  // Distant city bokeh.
  const bokehBlur = (animation.blurAmount ?? 8) * 0.7;
  for (let index = 0; index < 14; index += 1) {
    const x = (index * 79 + 33) % width;
    const y = height * (0.22 + ((index * 37) % 160) / 1000);
    blob(ctx, x, y, 8 + (index % 4) * 7 + bokehBlur, index % 5 === 0 ? '#FFD7A1' : '#87B7D8', 0.1);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawSnow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  animation: EnvironmentAnimationSettings,
  colors: string[],
  intensity: number,
): void {
  ctx.fillStyle = animation.snowNight ? 'rgba(9, 18, 32, 0.5)' : 'rgba(235, 245, 252, 0.12)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 6; index += 1) {
    blob(
      ctx,
      width * (0.16 + index * 0.15),
      height * (0.24 + (index % 3) * 0.2),
      10 + (index % 3) * 8,
      colors[index % colors.length],
      0.12 * intensity,
    );
  }
  const density = animation.snowDensity ?? 0.55;
  const count = Math.round(40 + density * 110);
  const wind = (animation.snowWind ?? 0.18) * 24;
  for (let index = 0; index < count; index += 1) {
    const seed = (index * 7919 + 104729) % 233280;
    const random = seed / 233280;
    const radius = 0.8 + (index % 5) * 0.55;
    const speed = 12 + (index % 7) * 5;
    const y = (random * height + time * speed) % height;
    const x = (seed / 233280 * width + time * wind * (0.4 + radius / 4)) % width;
    ctx.fillStyle = rgba('#F7FBFF', 0.18 + (index % 5) * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawProceduralFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  background: BackgroundStyle,
  animation: EnvironmentAnimationSettings,
): void {
  const ctx = context;
  ctx.clearRect(0, 0, width, height);
  const colors = [
    background.gradientFrom,
    background.gradientMid ?? background.gradientFrom,
    background.gradientTo,
    background.gradientAccent ?? animation.color,
  ];
  const intensity = animation.intensity ?? 0.5;
  switch (animation.type) {
    case 'flow':
    case 'gradient':
      drawFlow(ctx, width, height, time, colors, intensity);
      break;
    case 'breathe':
      drawBreathe(ctx, width, height, time, colors, intensity);
      break;
    case 'orbs':
    case 'fireflies':
      drawOrbs(ctx, width, height, time, colors, intensity);
      break;
    case 'aurora':
      drawAurora(ctx, width, height, time, colors, intensity);
      break;
    case 'rain-traffic':
    case 'rain':
      drawRain(ctx, width, height, time, animation, intensity);
      break;
    case 'snow':
      drawSnow(ctx, width, height, time, animation, colors, intensity);
      break;
    case 'dust':
      drawOrbs(ctx, width, height, time * 0.5, colors, intensity * 0.45);
      break;
    default:
      break;
  }
}

export function ProceduralBackground({ background, animation }: ProceduralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animation.enabled || animation.type === 'none') return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = Math.max(1, canvas.clientWidth);
    let height = Math.max(1, canvas.clientHeight);
    let active = document.visibilityState !== 'hidden';
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduced = false;
    }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, animation.lowPower ? 1 : 1.5);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onVisibility = () => {
      active = document.visibilityState !== 'hidden';
    };
    const onBlur = () => {
      active = false;
    };
    const onFocus = () => {
      active = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    const targetFps = animation.lowPower ? 15 : 30;
    const frameInterval = 1000 / targetFps;
    let lastFrame = 0;
    const startedAt = performance.now();
    let elapsed = 0;

    const render = (now: number) => {
      frameRef.current = requestAnimationFrame(render);
      if (!active) return;
      if (animation.speed <= 0) {
        drawProceduralFrame(ctx, width, height, 0, background, animation);
        cancelAnimationFrame(frameRef.current);
        return;
      }
      if (now - lastFrame < frameInterval) return;
      lastFrame = now;
      if (!reduced) elapsed = ((now - startedAt) / 1000) * Math.max(0, animation.speed);
      drawProceduralFrame(ctx, width, height, elapsed, background, animation);
      if (reduced) {
        cancelAnimationFrame(frameRef.current);
      }
    };
    frameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      ctx.clearRect(0, 0, width, height);
    };
  }, [animation, background]);

  return (
    <canvas
      ref={canvasRef}
      className="scene-procedural"
      data-animation-type={animation.type}
      aria-hidden="true"
    />
  );
}
