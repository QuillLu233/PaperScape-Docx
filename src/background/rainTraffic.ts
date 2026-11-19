import type { EnvironmentAnimationSettings } from '../types';

type LampType = 'tail' | 'head';
type Lane = 'far' | 'near';

interface Vehicle {
  x: number;
  y: number;
  direction: 1 | -1;
  speed: number;
  depth: number;
  lampSpacing: number;
  brightness: number;
  lampType: LampType;
  reflectionLength: number;
  lane: Lane;
}

interface StaticDrop {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  highlight: number;
}

interface SlidingDrop {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  alpha: number;
  trail: number;
}

interface LargeDrop {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

const PALETTE = {
  night: '#0C1625',
  skyline: '#1B3042',
  street: '#19232B',
  road: '#101923',
  tailCore: '#FFB1A0',
  tailMid: '#EE514B',
  tailOuter: '#E72D39',
  headCore: '#FFF9DF',
  headMid: '#FFDA90',
  headOuter: '#EACB7C',
  streetLamp: '#D4AF76',
  glass: '#B9C8CE',
};

const spriteCache = new Map<LampType, HTMLCanvasElement>();

function createLampSprite(type: LampType, size = 128): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = spriteCache.get(type);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const radius = size / 2;
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  const stops: Array<[number, string]> =
    type === 'tail'
      ? [
          [0, 'rgba(255, 241, 226, 1)'],
          [0.1, 'rgba(255, 177, 160, 0.98)'],
          [0.28, 'rgba(238, 81, 75, 0.86)'],
          [0.55, 'rgba(231, 45, 57, 0.3)'],
          [1, 'rgba(231, 45, 57, 0)'],
        ]
      : [
          [0, 'rgba(255, 255, 255, 1)'],
          [0.12, 'rgba(255, 249, 223, 0.98)'],
          [0.32, 'rgba(255, 218, 144, 0.76)'],
          [0.62, 'rgba(234, 203, 124, 0.23)'],
          [1, 'rgba(234, 203, 124, 0)'],
        ];
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  spriteCache.set(type, canvas);
  return canvas;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function hash(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class RainTrafficScene {
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticWidth = 0;
  private staticHeight = 0;
  private staticBlur = -1;
  private vehicles: Vehicle[] = [];
  private staticDrops: StaticDrop[] = [];
  private slidingDrops: SlidingDrop[] = [];
  private largeDrops: LargeDrop[] = [];
  private lastTime = 0;
  private initialised = false;

  reset(): void {
    this.staticCanvas = null;
    this.staticWidth = 0;
    this.staticHeight = 0;
    this.staticBlur = -1;
    this.vehicles = [];
    this.staticDrops = [];
    this.slidingDrops = [];
    this.largeDrops = [];
    this.lastTime = 0;
    this.initialised = false;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    this.ensureStatic(width, height, animation);
    const dt = Math.min(0.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    this.ensureGlassDrops(width, height, animation);
    this.ensureVehicles(width, height, animation);

    ctx.clearRect(0, 0, width, height);
    if (this.staticCanvas) {
      ctx.globalAlpha = 1;
      ctx.drawImage(this.staticCanvas, 0, 0, width, height);
    } else {
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(0, 0, width, height);
    }

    this.drawAtmosphere(ctx, width, height, animation);
    this.drawVehicles(ctx, width, height, dt, animation);
    this.drawGlassDrops(ctx, width, height, dt, animation);
    this.drawVignette(ctx, width, height, animation);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private ensureStatic(
    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const blur = animation.blurAmount ?? 8;
    if (
      this.staticCanvas &&
      this.staticWidth === Math.round(width) &&
      this.staticHeight === Math.round(height) &&
      this.staticBlur === blur
    ) {
      return;
    }
    if (typeof document === 'undefined') return;
    const scale = Math.max(0.55, Math.min(1, 1 - blur * 0.025));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const c = canvas.getContext('2d');
    if (!c) return;
    c.scale(scale, scale);
    this.paintCity(c, width, height);
    this.staticCanvas = canvas;
    this.staticWidth = Math.round(width);
    this.staticHeight = Math.round(height);
    this.staticBlur = blur;
  }

  private paintCity(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, PALETTE.night);
    sky.addColorStop(0.42, '#101B2A');
    sky.addColorStop(0.6, PALETTE.street);
    sky.addColorStop(1, PALETTE.road);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Distant skyline.
    ctx.fillStyle = PALETTE.skyline;
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 79 + 17) % width;
      const w = 34 + ((index * 37) % 70);
      const h = 70 + ((index * 53) % 180);
      ctx.fillRect(x, height * 0.44 - h, w, h);
      // Sparse windows, kept extremely soft.
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          if (hash(index * 17 + row * 5 + col) < 0.62) continue;
          ctx.fillStyle = `rgba(214, 186, 139, ${0.1 + hash(index + row) * 0.12})`;
          ctx.fillRect(x + 8 + col * 15, height * 0.44 - h + 12 + row * 17, 3, 5);
          ctx.fillStyle = PALETTE.skyline;
        }
      }
    }

    // Street band.
    const street = ctx.createLinearGradient(0, height * 0.44, 0, height * 0.62);
    street.addColorStop(0, 'rgba(25, 35, 43, 0.45)');
    street.addColorStop(0.5, 'rgba(25, 35, 43, 0.96)');
    street.addColorStop(1, PALETTE.street);
    ctx.fillStyle = street;
    ctx.fillRect(0, height * 0.44, width, height * 0.18);

    // Road and wet base.
    const road = ctx.createLinearGradient(0, height * 0.6, 0, height);
    road.addColorStop(0, PALETTE.street);
    road.addColorStop(0.35, PALETTE.road);
    road.addColorStop(1, '#080E15');
    ctx.fillStyle = road;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Lane hints and broken reflections.
    ctx.strokeStyle = 'rgba(195, 205, 205, 0.08)';
    ctx.lineWidth = 1;
    for (let lane = 1; lane < 4; lane += 1) {
      const y = height * (0.63 + lane * 0.075);
      ctx.beginPath();
      for (let x = 0; x < width; x += 34) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 18, y);
      }
      ctx.stroke();
    }
    for (let index = 0; index < 20; index += 1) {
      const x = hash(index * 3.1) * width;
      const y = height * (0.64 + hash(index * 8.7) * 0.3);
      ctx.fillStyle = `rgba(185, 200, 206, ${0.025 + hash(index) * 0.03})`;
      ctx.fillRect(x, y, 18 + hash(index + 4) * 55, 1);
    }
    this.paintStaticLamps(ctx, width, height);
  }

  private paintStaticLamps(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let index = 0; index < 7; index += 1) {
      const x = width * (0.08 + index * 0.14);
      const y = height * (0.48 + (index % 2) * 0.025);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 + (index % 3) * 12);
      glow.addColorStop(0, 'rgba(212, 175, 118, 0.42)');
      glow.addColorStop(0.35, 'rgba(212, 175, 118, 0.16)');
      glow.addColorStop(1, 'rgba(212, 175, 118, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 45, y - 35, 90, 70);
      ctx.fillStyle = 'rgba(212, 175, 118, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAtmosphere(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const brightness = animation.backgroundBrightness ?? 0.9;
    const haze = ctx.createLinearGradient(0, height * 0.58, 0, height * 0.9);
    haze.addColorStop(0, 'rgba(212, 175, 118, 0)');
    haze.addColorStop(0.32, `rgba(212, 175, 118, ${0.035 + brightness * 0.02})`);
    haze.addColorStop(1, 'rgba(16, 25, 35, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * 0.58, width, height * 0.32);
  }

  private ensureVehicles(    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const density = animation.trafficDensity ?? 0.55;
    const target = Math.max(2, Math.round(3 + density * 11));
    while (this.vehicles.length < target) {
      this.vehicles.push(this.createVehicle(width, height, animation, true));
    }
    while (this.vehicles.length > target) this.vehicles.pop();
  }

  private createVehicle(
    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
    anywhere = false,
  ): Vehicle {
    const lane: Lane = Math.random() < 0.45 ? 'far' : 'near';
    const depth = lane === 'far' ? randomBetween(0.55, 0.72) : randomBetween(0.9, 1.15);
    const direction = lane === 'far' ? 1 : -1;
    const y =
      lane === 'far'
        ? height * randomBetween(0.63, 0.69)
        : height * randomBetween(0.71, 0.79);
    const margin = width * 0.25;
    const x = anywhere
      ? randomBetween(-margin, width + margin)
      : direction === 1
        ? -margin
        : width + margin;
    return {
      x,
      y,
      direction,
      speed: (lane === 'far' ? randomBetween(16, 29) : randomBetween(34, 58)) *
        (animation.trafficSpeed ?? 0.55),
      depth,
      lampSpacing: (lane === 'far' ? 22 : 34) * depth,
      brightness: lane === 'far' ? randomBetween(0.5, 0.78) : randomBetween(0.72, 1),
      lampType: lane === 'far' ? 'tail' : 'head',
      reflectionLength: (lane === 'far' ? 44 : 76) * depth,
      lane,
    };
  }

  private drawVehicles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const lightScale = animation.lightBrightness ?? 0.65;
    const blur = animation.blurAmount ?? 8;
    for (const vehicle of this.vehicles) {
      vehicle.x += vehicle.direction * vehicle.speed * dt;
      const margin = width * 0.28;
      if (
        (vehicle.direction === 1 && vehicle.x > width + margin) ||
        (vehicle.direction === -1 && vehicle.x < -margin)
      ) {
        const recycled = this.createVehicle(width, height, animation);
        Object.assign(vehicle, recycled);
      }

      // Motion trail behind the pair of lamps.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const trail = ctx.createLinearGradient(
        vehicle.x - vehicle.direction * 90,
        vehicle.y,
        vehicle.x,
        vehicle.y,
      );
      const tail = vehicle.lampType === 'tail';
      trail.addColorStop(0, 'rgba(0,0,0,0)');
      trail.addColorStop(0.65, tail ? 'rgba(231,45,57,0.08)' : 'rgba(234,203,124,0.1)');
      trail.addColorStop(1, tail ? 'rgba(238,81,75,0.18)' : 'rgba(255,218,144,0.22)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = (tail ? 5 : 8) * vehicle.depth;
      ctx.beginPath();
      ctx.moveTo(vehicle.x - vehicle.direction * 110, vehicle.y + 2);
      ctx.lineTo(vehicle.x, vehicle.y);
      ctx.stroke();
      ctx.restore();

      this.drawReflection(ctx, width, height, vehicle, lightScale);
      this.drawLampPair(ctx, vehicle, lightScale, blur);
    }
  }

  private drawLampPair(
    ctx: CanvasRenderingContext2D,
    vehicle: Vehicle,
    lightScale: number,
    blur: number,
  ): void {
    const sprite = createLampSprite(vehicle.lampType);
    if (!sprite) return;
    const radius =
      (vehicle.lampType === 'tail' ? 34 : 42) *
      vehicle.depth *
      (0.8 + blur / 30);
    const spacing = vehicle.lampSpacing;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const offset of [-spacing / 2, spacing / 2]) {
      ctx.globalAlpha = Math.min(1, vehicle.brightness * lightScale * 1.35);
      ctx.drawImage(
        sprite,
        vehicle.x + offset - radius,
        vehicle.y - radius * 0.7,
        radius * 2,
        radius * 1.4,
      );
    }
    // Small hot cores keep the lamps readable at a distance.
    ctx.globalAlpha = Math.min(1, vehicle.brightness * lightScale * 1.2);
    ctx.fillStyle = vehicle.lampType === 'tail' ? PALETTE.tailCore : PALETTE.headCore;
    for (const offset of [-spacing / 2, spacing / 2]) {
      ctx.beginPath();
      ctx.ellipse(
        vehicle.x + offset,
        vehicle.y,
        Math.max(1.2, radius * 0.055),
        Math.max(1, radius * 0.04),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  private drawReflection(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vehicle: Vehicle,
    lightScale: number,
  ): void {
    const tail = vehicle.lampType === 'tail';
    const reflectionTop = vehicle.y + 6;
    const reflectionBottom = Math.min(
      height,
      reflectionTop + vehicle.reflectionLength * (0.9 + (vehicle.depth - 0.5) * 0.3),
    );
    if (reflectionBottom <= reflectionTop) return;
    const spacing = vehicle.lampSpacing;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const offset of [-spacing / 2, spacing / 2]) {
      const x = vehicle.x + offset;
      const gradient = ctx.createLinearGradient(0, reflectionTop, 0, reflectionBottom);
      gradient.addColorStop(
        0,
        tail
          ? `rgba(238, 81, 75, ${0.4 * lightScale})`
          : `rgba(255, 218, 144, ${0.44 * lightScale})`,
      );
      gradient.addColorStop(0.35, tail ? 'rgba(231,45,57,0.2)' : 'rgba(234,203,124,0.22)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      const baseWidth = Math.max(2, 3.5 * vehicle.depth);
      for (let segment = 0; segment < 5; segment += 1) {
        const sy = reflectionTop + (reflectionBottom - reflectionTop) * (segment * 0.17);
        const wobble = (hash(vehicle.x + segment * 11.3) - 0.5) * 5;
        ctx.globalAlpha = 0.8 - segment * 0.12;
        ctx.fillRect(
          x + wobble - baseWidth / 2,
          sy,
          baseWidth + segment * 0.8,
          (reflectionBottom - reflectionTop) * 0.11,
        );
      }
    }
    // Broad wet-road glow under the pair.
    const glow = ctx.createRadialGradient(
      vehicle.x,
      reflectionTop + 12,
      0,
      vehicle.x,
      reflectionTop + 12,
      38 * vehicle.depth,
    );
    glow.addColorStop(0, tail ? 'rgba(231,45,57,0.16)' : 'rgba(255,218,144,0.18)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = glow;
    ctx.fillRect(0, reflectionTop, width, reflectionBottom - reflectionTop);
    ctx.restore();
  }

  private ensureGlassDrops(
    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const density = animation.rainDensity ?? 0.65;
    const target = Math.round(26 + density * 52);
    if (!this.initialised || this.staticDrops.length !== target) {
      this.staticDrops = Array.from({ length: target }, (_, index) => {
        const seed = index + 1;
        return {
          x: hash(seed * 3.7) * width,
          y: hash(seed * 9.1) * height,
          radius: 1.4 + hash(seed * 4.3) * 3.8,
          alpha: 0.2 + hash(seed * 8.4) * 0.3,
          highlight: hash(seed * 6.2) * 0.5 + 0.4,
        };
      });
      this.initialised = true;
    }
    if (this.largeDrops.length === 0) {
      this.largeDrops = Array.from({ length: 4 }, (_, index) => ({
        x: randomBetween(width * 0.08, width * 0.92),
        y: randomBetween(height * 0.08, height * 0.8),
        radius: randomBetween(10, 22) + index * 1.5,
        alpha: randomBetween(0.12, 0.24),
      }));
    }
    const slideTarget = Math.max(2, Math.round(3 + density * 8));
    while (this.slidingDrops.length < slideTarget) {
      this.slidingDrops.push({
        x: randomBetween(0, width),
        y: randomBetween(-height * 0.1, height * 0.5),
        radius: randomBetween(1.2, 3.2),
        speed: randomBetween(7, 22) * (animation.rainFallSpeed ?? 0.7),
        drift: randomBetween(-5, 5),
        alpha: randomBetween(0.25, 0.55),
        trail: randomBetween(24, 90),
      });
    }
    while (this.slidingDrops.length > slideTarget) this.slidingDrops.pop();
  }

  private drawGlassDrops(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const slideSpeed = animation.rainFallSpeed ?? 0.7;
    ctx.save();
    for (const drop of this.staticDrops) {
      ctx.globalAlpha = drop.alpha;
      ctx.fillStyle = 'rgba(8, 16, 24, 0.28)';
      ctx.beginPath();
      ctx.arc(drop.x + 0.8, drop.y + 0.8, drop.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(185, 200, 206, ${0.16 + drop.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = drop.alpha * drop.highlight;
      ctx.fillStyle = PALETTE.glass;
      ctx.beginPath();
      ctx.arc(drop.x - drop.radius * 0.3, drop.y - drop.radius * 0.35, drop.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const drop of this.largeDrops) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.clip();
      if (this.staticCanvas) {
        const scaleX = this.staticCanvas.width / width;
        const scaleY = this.staticCanvas.height / height;
        ctx.globalAlpha = drop.alpha + 0.18;
        ctx.drawImage(
          this.staticCanvas,
          Math.max(0, (drop.x - drop.radius) * scaleX),
          Math.max(0, (drop.y - drop.radius) * scaleY),
          drop.radius * 2 * scaleX,
          drop.radius * 2 * scaleY,
          drop.x - drop.radius + 3,
          drop.y - drop.radius + 4,
          drop.radius * 2,
          drop.radius * 2,
        );
      }
      ctx.fillStyle = 'rgba(14, 25, 34, 0.28)';
      ctx.fillRect(drop.x - drop.radius, drop.y - drop.radius, drop.radius * 2, drop.radius * 2);
      ctx.restore();
      ctx.globalAlpha = drop.alpha;
      ctx.strokeStyle = 'rgba(185, 200, 206, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = drop.alpha * 0.9;
      ctx.fillStyle = PALETTE.glass;
      ctx.beginPath();
      ctx.arc(drop.x - drop.radius * 0.32, drop.y - drop.radius * 0.35, drop.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const drop of this.slidingDrops) {
      drop.y += drop.speed * slideSpeed * dt * 3;
      drop.x += drop.drift * dt;
      if (drop.y > height + drop.trail) {
        drop.y = randomBetween(-drop.trail, 0);
        drop.x = randomBetween(0, width);
        drop.speed = randomBetween(7, 22) * slideSpeed;
        drop.trail = randomBetween(24, 90);
      }
      ctx.globalAlpha = drop.alpha;
      ctx.strokeStyle = 'rgba(185, 200, 206, 0.22)';
      ctx.lineWidth = max(0.8, drop.radius * 0.75);
      ctx.beginPath();
      ctx.moveTo(drop.x - drop.drift * 0.3, drop.y - drop.trail);
      ctx.quadraticCurveTo(drop.x + drop.drift, drop.y - drop.trail * 0.45, drop.x, drop.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(210, 225, 230, 0.28)';
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y, drop.radius, drop.radius * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = drop.alpha * 0.8;
      ctx.fillStyle = PALETTE.glass;
      ctx.beginPath();
      ctx.arc(drop.x - drop.radius * 0.35, drop.y - drop.radius * 0.45, drop.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void animation;
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    animation: EnvironmentAnimationSettings,
  ): void {
    const brightness = animation.backgroundBrightness ?? 0.9;
    ctx.save();
    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      Math.min(width, height) * 0.2,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.62, 'rgba(0,0,0,0.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    if (brightness < 1) {
      ctx.fillStyle = `rgba(2, 6, 10, ${Math.min(0.45, (1 - brightness) * 0.5)})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }
}

function max(a: number, b: number): number {
  return a > b ? a : b;
}
