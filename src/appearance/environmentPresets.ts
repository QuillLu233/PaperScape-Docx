import type {
  BackgroundStyle,
  EnvironmentAnimationSettings,
  EnvironmentDisplaySettings,
  EnvironmentPreset,
  EnvironmentUiColors,
  PaperSettings,
} from '../types';

interface EnvironmentSeed {
  id: string;
  name: string;
  background: [string, string, string];
  uiMain: string;
  sidebar: string;
  panel?: string;
  toolbar?: string;
  statusbar?: string;
  accent: string;
  paper: string;
  text: string;
  displayColor?: string;
  textSoft?: string;
  border?: string;
  hover?: string;
  selected?: string;
  caret?: string;
  selection?: string;
  titleColor?: string;
  gradientAccent?: string;
  effects?: string[];
  group: 'permanent' | 'festival';
  animationType?: string;
  animationEnabled?: boolean;
  animationColor?: string;
  uiTheme: 'light' | 'dark';
}

function hex(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#000000';
}

export function mixColor(first: string, second: string, amount: number): string {
  const a = hex(first).slice(1);
  const b = hex(second).slice(1);
  const weight = Math.min(1, Math.max(0, amount));
  return `#${[0, 2, 4]
    .map((offset) => {
      const left = Number.parseInt(a.slice(offset, offset + 2), 16);
      const right = Number.parseInt(b.slice(offset, offset + 2), 16);
      return Math.round(left + (right - left) * weight)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

export function colorAlpha(color: string, alpha: number): string {
  const value = hex(color).slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (value: string) => {
    const raw = hex(value).slice(1);
    const channels = [0, 2, 4].map((offset) => {
      const channel = Number.parseInt(raw.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function createUiColors(seed: Pick<EnvironmentSeed, 'uiMain' | 'sidebar' | 'accent' | 'paper' | 'text' | 'uiTheme'> & Partial<Pick<EnvironmentSeed, 'panel' | 'toolbar' | 'statusbar' | 'textSoft' | 'border' | 'hover' | 'selected' | 'caret' | 'selection'>>): EnvironmentUiColors {
  const { uiMain, sidebar, accent, paper, text, uiTheme } = seed;
  const panel = seed.panel ?? uiMain;
  const textSoft = seed.textSoft ?? mixColor(text, paper, 0.2);
  const border = seed.border ?? mixColor(paper, text, uiTheme === 'dark' ? 0.22 : 0.15);
  const selected = seed.selected ?? mixColor(uiMain, accent, uiTheme === 'dark' ? 0.3 : 0.2);
  const dark = uiTheme === 'dark';
  return {
    titlebar: uiMain,
    menubar: uiMain,
    toolbar: seed.toolbar ?? panel,
    sidebar,
    settings: panel,
    statusbar: seed.statusbar ?? sidebar,
    popup: panel,
    button: mixColor(uiMain, accent, 0.08),
    accent,
    accentStrong: dark ? mixColor(accent, '#ffffff', 0.18) : mixColor(accent, text, 0.22),
    accentSoft: mixColor(uiMain, accent, dark ? 0.16 : 0.12),
    border,
    ink: text,
    inkSoft: textSoft,
    muted: mixColor(text, paper, dark ? 0.52 : 0.46),
    hover: seed.hover ?? mixColor(uiMain, accent, dark ? 0.2 : 0.1),
    selected,
    scrollbar: mixColor(text, paper, dark ? 0.35 : 0.28),
    caret: seed.caret ?? accent,
    selection: seed.selection ?? colorAlpha(selected, dark ? 0.42 : 0.28),
    proofreading: dark ? '#d9b46a' : '#b07a2e',
  };
}

function createPaper(color: string, opacity: number, width = 794): PaperSettings {
  return {
    pageSize: 'A4',
    customWidth: width,
    color,
    opacity,
    shadow: 30,
    margin: 'normal',
    customMargins: { top: 96, right: 96, bottom: 96, left: 96 },
  };
}

const SEEDS: EnvironmentSeed[] = [
  {
    id: 'origin',
    name: '原初',
    background: ['#DCE5D6', '#99AE99', '#F1EDCF'],
    uiMain: '#F6F7F1',
    sidebar: '#EEF2E9',
    accent: '#57755B',
    paper: '#FAF9F0',
    text: '#344536',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'pure',
    name: '素纸',
    background: ['#F3F3F3', '#CDD2D5', '#FFFFFF'],
    uiMain: '#F5F5F5',
    sidebar: '#EBEDEF',
    accent: '#677481',
    paper: '#FFFFFF',
    text: '#333333',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'warm-light',
    name: '暖阳',
    background: ['#C09B71', '#F4DFBC', '#F4E5B5'],
    uiMain: '#FAF2E5',
    sidebar: '#EFE3D1',
    accent: '#A47B4D',
    paper: '#FBF0DC',
    text: '#563E26',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'deep-ocean',
    name: '深海',
    background: ['#10182F', '#287B91', '#648AB9'],
    uiMain: '#182638',
    sidebar: '#213247',
    accent: '#75B3CF',
    paper: '#203349',
    text: '#EDF4FA',
    group: 'permanent',
    uiTheme: 'dark',
  },
  {
    id: 'aurora',
    name: '极光',
    background: ['#164B9A', '#169BAE', '#A5D6A7'],
    uiMain: '#182C40',
    sidebar: '#20374B',
    accent: '#72C8CF',
    paper: '#1B394B',
    text: '#F0F6FA',
    group: 'permanent',
    uiTheme: 'dark',
  },
  {
    id: 'midnight',
    name: '墨夜',
    background: ['#111216', '#494F58', '#626B78'],
    uiMain: '#202226',
    sidebar: '#26292E',
    accent: '#9CA8B7',
    paper: '#292D32',
    text: '#EEEEEE',
    group: 'permanent',
    uiTheme: 'dark',
  },
  {
    id: 'violet-night',
    name: '紫夜',
    background: ['#30205E', '#8A579D', '#C3A0DD'],
    uiMain: '#282238',
    sidebar: '#322A44',
    accent: '#BC9CDE',
    paper: '#352A4B',
    text: '#F3EAFA',
    group: 'permanent',
    uiTheme: 'dark',
  },
  {
    id: 'sunset',
    name: '暖霞',
    background: ['#87364E', '#BA5C56', '#E9B781'],
    uiMain: '#FAF0E7',
    sidebar: '#F4E5DA',
    accent: '#B77259',
    paper: '#FFF0E0',
    text: '#603C36',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'verdant',
    name: '青岚',
    background: ['#234D43', '#518870', '#B3C9A4'],
    uiMain: '#E8EEE7',
    sidebar: '#DCE7DC',
    accent: '#4D8067',
    paper: '#EDF2E7',
    text: '#29483A',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'rosy-dream',
    name: '绯梦',
    background: ['#75458C', '#B26D99', '#EBBBC8'],
    uiMain: '#FAF0F6',
    sidebar: '#F2E4ED',
    accent: '#AD7197',
    paper: '#F9EEF5',
    text: '#65405E',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'winter',
    name: '冬日',
    background: ['#BDCDE0', '#E7F0F5', '#FFFFFF'],
    uiMain: '#F4F8FB',
    sidebar: '#E5EDF4',
    accent: '#648BA9',
    paper: '#F6F9FC',
    text: '#263B50',
    group: 'permanent',
    uiTheme: 'light',
  },
  {
    id: 'christmas-carol',
    name: '圣诞颂歌',
    background: ['#781C2D', '#B24448', '#28594B'],
    uiMain: '#682D37',
    sidebar: '#51232C',
    panel: '#682D37',
    toolbar: '#51232C',
    statusbar: '#51232C',
    accent: '#F1D5A0',
    paper: '#FFF7E9',
    text: '#FFF1E0',
    displayColor: '#533C35',
    textSoft: '#D8BEC0',
    border: '#89565E',
    hover: '#783840',
    selected: '#8B434B',
    caret: '#873244',
    selection: '#EAD0C3',
    titleColor: '#503038',
    gradientAccent: '#F1D5A0',
    effects: ['snow', 'gradient', 'golden-glow'],
    group: 'festival',
    animationType: 'snow',
    animationColor: '#F1D5A0',
    uiTheme: 'dark',
  },
  {
    id: 'spring-festival',
    name: '岁序新春',
    background: ['#791924', '#B32E35', '#D58043'],
    uiMain: '#F7ECDF',
    sidebar: '#EDDDCF',
    panel: '#F7ECDF',
    accent: '#AD3933',
    paper: '#FFF5E2',
    text: '#59372C',
    displayColor: '#59372C',
    textSoft: '#88665C',
    border: '#D8B9A5',
    selected: '#ECD1C4',
    group: 'festival',
    animationType: 'gradient',
    animationColor: '#F5D79C',
    uiTheme: 'light',
  },
];

function createEnvironment(seed: EnvironmentSeed): EnvironmentPreset {
  const uiColors = createUiColors(seed);
  const background: BackgroundStyle = {
    presetId: `environment-${seed.id}`,
    name: seed.name,
    kind: 'gradient',
    source: 'environment',
    color: seed.background[0],
    gradientFrom: seed.background[0],
    gradientMid: seed.background[1],
    gradientTo: seed.background[2],
    gradientAccent: seed.gradientAccent,
    gradientAngle: 135,
    imageId: null,
    brightness: 100,
    blur: 0,
    vignette: seed.uiTheme === 'dark' ? 28 : 14,
    overlay: seed.uiTheme === 'dark' ? 10 : 5,
    overlayColor: seed.background[0],
  };
  const display: EnvironmentDisplaySettings = {
    colorMode: 'auto',
    color: seed.displayColor ?? seed.text,
    titleColor: seed.titleColor ?? seed.text,
    fontFamily: '',
  };
  const animation: EnvironmentAnimationSettings = {
    enabled: false,
    paused: false,
    type: 'none',
    effects: [],
    speed: 1,
    intensity: 0.55,
    color: seed.animationColor ?? seed.accent,
    lowPower: false,
    rainDensity: 0.55,
    rainFallSpeed: 0.7,
    trafficDensity: 0.5,
    trafficSpeed: 0.55,
    lightBrightness: 0.7,
    backgroundBrightness: 0.9,
    blurAmount: 8,
    snowDensity: 0.6,
    snowWind: 0.18,
    snowNight: seed.uiTheme === 'dark',
  };
  const paper = createPaper(seed.paper, 0.98);
  const immersive = createPaper(seed.paper, 0.8, 790);
  return {
    id: seed.id,
    name: seed.name,
    schemaVersion: 1,
    presetType: 'official',
    group: seed.group,
    uiTheme: seed.uiTheme,
    uiColors,
    backgroundType: 'gradient',
    gradientColors: seed.background,
    background,
    paper,
    immersive,
    display,
    animation,
    resourceReferences: [],
  };
}

export const OFFICIAL_ENVIRONMENTS: EnvironmentPreset[] = SEEDS.map(createEnvironment);

export const DEFAULT_ENVIRONMENT_ID = 'origin';

export function getOfficialEnvironment(id: string): EnvironmentPreset | undefined {
  return OFFICIAL_ENVIRONMENTS.find((preset) => preset.id === id);
}

export const ORIGIN_ENVIRONMENT = OFFICIAL_ENVIRONMENTS[0];

export const DEFAULT_UI_COLORS = ORIGIN_ENVIRONMENT.uiColors;
export const DEFAULT_BACKGROUND = ORIGIN_ENVIRONMENT.background;
export const DEFAULT_PAPER = ORIGIN_ENVIRONMENT.paper;
export const DEFAULT_IMMERSIVE = ORIGIN_ENVIRONMENT.immersive;
export const DEFAULT_DISPLAY = ORIGIN_ENVIRONMENT.display;
export const DEFAULT_ANIMATION = ORIGIN_ENVIRONMENT.animation;

export function environmentThumbnailStyle(preset: EnvironmentPreset): { backgroundImage: string } {
  const linear = `linear-gradient(135deg, ${preset.gradientColors[0]} 0%, ${preset.gradientColors[1]} 52%, ${preset.gradientColors[2]} 100%)`;
  return {
    backgroundImage: preset.background.gradientAccent
      ? `radial-gradient(circle at 72% 22%, ${colorAlpha(preset.background.gradientAccent, 0.45)} 0%, transparent 40%), ${linear}`
      : linear,
  };
}
