import { useEffect, type RefObject } from 'react';
import type { Editor } from '@tiptap/core';
import { moveEditorText } from './textDrag';

interface Candidate {
  x: number;
  y: number;
  from: number;
  to: number;
}

interface DragState {
  from: number;
  to: number;
  dropAt: number;
  x: number;
  y: number;
  copy: boolean;
}

const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 48;
const EDGE_SPEED = 14;

export function useTextDrag(
  editor: Editor | null,
  paneRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const host = paneRef.current?.querySelector<HTMLElement>('.editor-scroll');
    const indicator = indicatorRef.current;
    if (!host || !indicator) return;

    let candidate: Candidate | null = null;
    let drag: DragState | null = null;
    let frame: number | undefined;

    const hideIndicator = () => {
      indicator.style.display = 'none';
      indicator.classList.remove('is-copy');
    };

    const dropPosition = (x: number, y: number): number | null => {
      const coords = editor.view.posAtCoords({ left: x, top: y });
      if (!coords) return null;
      const max = editor.state.doc.content.size;
      return coords.pos >= 0 && coords.pos <= max ? coords.pos : null;
    };

    const showIndicator = (pos: number, copy: boolean) => {
      const coords = editor.view.coordsAtPos(pos);
      indicator.style.display = 'block';
      indicator.style.left = `${coords.left}px`;
      indicator.style.top = `${coords.top}px`;
      indicator.style.height = `${Math.max(14, coords.bottom - coords.top)}px`;
      indicator.classList.toggle('is-copy', copy);
    };

    const updateTarget = (x: number, y: number, copy: boolean) => {
      if (!drag) return;
      const pos = dropPosition(x, y);
      if (pos === null) {
        hideIndicator();
        return;
      }
      drag.dropAt = pos;
      drag.x = x;
      drag.y = y;
      drag.copy = copy;
      if (!copy && pos >= drag.from && pos <= drag.to) {
        hideIndicator();
        return;
      }
      showIndicator(pos, copy);
    };

    const stopFrame = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
    };

    const autoScroll = () => {
      if (!drag) return;
      const rect = host.getBoundingClientRect();
      let speed = 0;
      if (drag.y < rect.top + EDGE_MARGIN) speed = -EDGE_SPEED;
      else if (drag.y > rect.bottom - EDGE_MARGIN) speed = EDGE_SPEED;
      if (speed !== 0) {
        host.scrollTop += speed;
        updateTarget(drag.x, drag.y, drag.copy);
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const cleanup = () => {
      stopFrame();
      candidate = null;
      drag = null;
      hideIndicator();
      document.body.classList.remove('is-text-dragging');
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || editor.view.composing) return;
      const selection = editor.state.selection;
      if (selection.empty) return;
      const from = Math.min(selection.from, selection.to);
      const to = Math.max(selection.from, selection.to);
      const coords = dropPosition(event.clientX, event.clientY);
      if (coords === null || coords < from || coords > to) return;
      candidate = { x: event.clientX, y: event.clientY, from, to };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!candidate) return;
      if (!drag) {
        if (Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) < DRAG_THRESHOLD) {
          return;
        }
        drag = {
          from: candidate.from,
          to: candidate.to,
          dropAt: candidate.from,
          x: event.clientX,
          y: event.clientY,
          copy: event.ctrlKey,
        };
        document.body.classList.add('is-text-dragging');
        frame = requestAnimationFrame(autoScroll);
      }
      event.preventDefault();
      updateTarget(event.clientX, event.clientY, event.ctrlKey);
    };

    const finish = (event: PointerEvent) => {
      if (drag) {
        const position = dropPosition(event.clientX, event.clientY);
        if (position === null) {
          event.preventDefault();
          cleanup();
          return;
        }
        drag.dropAt = position;
        drag.copy = event.ctrlKey;
        const canDrop =
          drag.copy || !(drag.dropAt >= drag.from && drag.dropAt <= drag.to);
        if (canDrop) {
          moveEditorText(editor.view, drag.from, drag.to, drag.dropAt, drag.copy);
        }
        event.preventDefault();
      }
      cleanup();
    };

    const onCancel = () => cleanup();
    const onDragStart = (event: DragEvent) => {
      if (!candidate && !drag) return;
      // WebView2/Tauri native drag would otherwise show the forbidden cursor
      // and never deliver a ProseMirror drop event.
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        cleanup();
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKeyDown);
    dom.addEventListener('dragstart', onDragStart, true);
    return () => {
      cleanup();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKeyDown);
      dom.removeEventListener('dragstart', onDragStart, true);
    };
  }, [editor, indicatorRef, paneRef]);
}
