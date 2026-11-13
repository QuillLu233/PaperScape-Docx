import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'plus'
  | 'panel-left'
  | 'panel-right'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
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
  | 'keyboard'
  | 'undo'
  | 'redo'
  | 'search'
  | 'replace'
  | 'image'
  | 'table'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'bullet-list'
  | 'ordered-list'
  | 'indent'
  | 'outdent'
  | 'focus'
  | 'edit'
  | 'trash'
  | 'history'
  | 'save'
  | 'project'
  | 'folder'
  | 'file'
  | 'refresh'
  | 'external';

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
  'chevron-left': <path d="M9.5 3.5 6 7l3.5 3.5" />,
  'chevron-right': <path d="M6.5 3.5 10 7l-3.5 3.5" />,
  'chevron-up': <path d="m4.5 9.75 3.5-3.5 3.5 3.5" />,
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
  undo: (
    <>
      <path d="M3.2 6.3 6.4 3.1" />
      <path d="M3.2 6.3h5.1a4 4 0 0 1 0 8H6" />
    </>
  ),
  redo: (
    <>
      <path d="m12.8 6.3-3.2-3.2" />
      <path d="M12.8 6.3H7.7a4 4 0 0 0 0 8H10" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.1" />
      <path d="m10.2 10.2 3 3" />
    </>
  ),
  replace: (
    <>
      <path d="M3.2 5.2h7.4M8.4 3 10.6 5.2 8.4 7.4" />
      <path d="M12.8 10.8H5.4M7.6 8.6 5.4 10.8l2.2 2.2" />
    </>
  ),
  image: (
    <>
      <rect x="2" y="2.8" width="12" height="10.4" rx="1.3" />
      <circle cx="5.6" cy="6.1" r="1" />
      <path d="m2.6 11.6 3.2-3 2.5 2.2 2-1.8 3.1 2.6" />
    </>
  ),
  table: (
    <>
      <rect x="2" y="2.8" width="12" height="10.4" rx="1" />
      <path d="M2 6.1h12M2 9.5h12M6 6.1v7.1M10 6.1v7.1" />
    </>
  ),
  'align-left': <path d="M2.5 3.5h11M2.5 6.5h8M2.5 9.5h11M2.5 12.5h6.5" />,
  'align-center': <path d="M2.5 3.5h11M4 6.5h8M2.5 9.5h11M4.75 12.5h6.5" />,
  'align-right': <path d="M2.5 3.5h11M5.5 6.5h8M2.5 9.5h11M7 12.5h6.5" />,
  'align-justify': <path d="M2.5 3.5h11M2.5 6.5h11M2.5 9.5h11M2.5 12.5h11" />,
  'bullet-list': (
    <>
      <circle cx="3.2" cy="4" r=".7" fill="currentColor" stroke="none" />
      <circle cx="3.2" cy="8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="3.2" cy="12" r=".7" fill="currentColor" stroke="none" />
      <path d="M5.7 4h7.8M5.7 8h7.8M5.7 12h7.8" />
    </>
  ),
  'ordered-list': (
    <>
      <path d="M2.2 3h1.1v2.2M2.4 5.2h1.4M2.2 7.8c.3-.5 1.3-.5 1.3.2 0 .5-.5.8-1.3 1.3h1.4M2.2 11.1h1.4v1.2H2.2v1.2h1.4" />
      <path d="M6 4h7.5M6 8h7.5M6 12h7.5" />
    </>
  ),
  indent: (
    <>
      <path d="M2.5 2.8h11M2.5 12.8h11M6.8 5.5h6.7M6.8 8h6.7M6.8 10.5h6.7" />
      <path d="m2.4 6.1 2 2-2 2z" fill="currentColor" stroke="none" />
    </>
  ),
  outdent: (
    <>
      <path d="M2.5 2.8h11M2.5 12.8h11M6.8 5.5h6.7M6.8 8h6.7M6.8 10.5h6.7" />
      <path d="m4.4 6.1-2 2 2 2z" fill="currentColor" stroke="none" />
    </>
  ),
  focus: (
    <>
      <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
      <circle cx="8" cy="8" r="2.2" />
    </>
  ),
  edit: (
    <>
      <path d="m3 11.8.5-2.7L10.7 2l2.6 2.6-7.2 7.2-3.1.0Z" />
      <path d="m8.9 3.8 2.6 2.6M3.2 12.8h3.5" />
    </>
  ),
  trash: (
    <>
      <path d="M2.8 4.4h10.4M6 4.4V2.7h4v1.7M4.1 4.4l.6 9.1h6.6l.6-9.1" />
      <path d="M6.6 6.8v4M9.4 6.8v4" />
    </>
  ),
  history: (
    <>
      <path d="M2.7 8a5.3 5.3 0 1 0 1.5-3.7L2.6 5.9" />
      <path d="M2.5 2.7v3.3h3.3M8 4.8V8l2.2 1.3" />
    </>
  ),
  save: (
    <>
      <path d="M2.7 2.8h8.5l2 2v8.4H2.7z" />
      <path d="M5 2.8v3.4h5V2.8M5 13.2V9h6v4.2" />
    </>
  ),
  project: (
    <>
      <path d="M2.2 4.2h4.1l1.4 1.6h6.1v7.4H2.2z" />
      <path d="M2.2 6.1h11.6" />
    </>
  ),
  folder: (
    <>
      <path d="M2.2 4.2h4.1l1.4 1.6h6.1v7.4H2.2z" />
      <path d="M2.2 6.1h11.6" />
    </>
  ),
  file: (
    <>
      <path d="M4 2.3h5l3 3v8.4H4Z" />
      <path d="M9 2.3v3.2h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M12.7 6.3A5 5 0 1 0 13 9.8" />
      <path d="M12.7 3.7v2.6H10" />
    </>
  ),
  external: (
    <>
      <path d="M9.2 3.1h3.7v3.7" />
      <path d="M12.9 3.1 7.7 8.3" />
      <path d="M11.2 9.4v3.2H3.4V4.8h3.2" />
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
