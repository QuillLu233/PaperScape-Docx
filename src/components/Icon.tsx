import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'plus'
  | 'panel-left'
  | 'panel-right'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'close'
  | 'check'
  | 'minus'
  | 'reset'
  | 'keyboard';

const ICONS: Record<IconName, ReactNode> = {
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  'panel-left': (
    <>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.4" />
      <path d="M6.25 2.75v10.5" />
    </>
  ),
  'panel-right': (
    <>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.4" />
      <path d="M9.75 2.75v10.5" />
    </>
  ),
  'chevron-down': <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M12.6 3.4l-.85.85M4.25 11.75l-.85.85" />
    </>
  ),
  moon: <path d="M13.1 9.42A5.4 5.4 0 0 1 6.58 2.9 5.5 5.5 0 1 0 13.1 9.42Z" />,
  monitor: (
    <>
      <rect x="2" y="2.6" width="12" height="8.4" rx="1.2" />
      <path d="M6 14h4M8 11v3" />
    </>
  ),
  minimize: <path d="M3 8.5h10" />,
  maximize: <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="0.5" />,
  restore: (
    <>
      <path d="M5.4 5.4V3.3h7.3v7.3h-2.1" />
      <rect x="3.3" y="5.4" width="7.3" height="7.3" rx="0.5" />
    </>
  ),
  close: <path d="m3.6 3.6 8.8 8.8M12.4 3.6l-8.8 8.8" />,
  check: <path d="m3.2 8.4 3.1 3.1 6.5-7" />,
  minus: <path d="M3.5 8h9" />,
  reset: (
    <>
      <path d="M3.1 6.2A5.2 5.2 0 1 1 2.8 9" />
      <path d="M2.7 2.8v3.5h3.5" />
    </>
  ),
  keyboard: (
    <>
      <rect x="1.8" y="4" width="12.4" height="8" rx="1.3" />
      <path d="M4.2 6.4h.01M6.6 6.4h.01M9 6.4h.01M11.4 6.4h.01M4.2 9.6h.01M6.6 9.6h.01M9 9.6h.01M11.4 9.6h.01" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, strokeWidth = 1.55, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="brand-mark"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M10 6.5h8.6L23 11v14.5H10z" fill="var(--brand-paper, #f4efe3)" />
      <path d="M18.6 6.5 23 11h-4.4z" fill="var(--brand-fold, #d8cfba)" />
      <path d="M13.2 15.2h6.2M13.2 18.4h6.2M13.2 21.6h4.3" stroke="#405b47" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
