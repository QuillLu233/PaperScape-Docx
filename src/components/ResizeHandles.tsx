import type { PointerEvent } from 'react';
import { startResizeWindow, type ResizeEdge } from '../lib/window';

const HANDLES: Array<{ className: string; edge: ResizeEdge }> = [
  { className: 'resize-n', edge: 'North' },
  { className: 'resize-s', edge: 'South' },
  { className: 'resize-e', edge: 'East' },
  { className: 'resize-w', edge: 'West' },
  { className: 'resize-ne', edge: 'NorthEast' },
  { className: 'resize-nw', edge: 'NorthWest' },
  { className: 'resize-se', edge: 'SouthEast' },
  { className: 'resize-sw', edge: 'SouthWest' },
];

export function ResizeHandles({ hidden }: { hidden: boolean }) {
  if (hidden) return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, edge: ResizeEdge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    void startResizeWindow(edge);
  };

  return (
    <div className="resize-layer" aria-hidden="true">
      {HANDLES.map((handle) => (
        <div
          key={handle.className}
          className={`resize-handle ${handle.className}`}
          onPointerDown={(event) => handlePointerDown(event, handle.edge)}
        />
      ))}
    </div>
  );
}
