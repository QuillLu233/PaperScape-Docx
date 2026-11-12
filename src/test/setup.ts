import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const zeroRect: DOMRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  toJSON: () => ({}),
};

// ProseMirror queries layout APIs that jsdom does not implement.
Object.defineProperty(Node.prototype, 'getClientRects', {
  configurable: true,
  value: () => [] as unknown as DOMRectList,
});
Object.defineProperty(Node.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => zeroRect,
});
Object.defineProperty(Range.prototype, 'getClientRects', {
  configurable: true,
  value: () => [zeroRect] as unknown as DOMRectList,
});
Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => zeroRect,
});
Object.defineProperty(document, 'elementFromPoint', {
  configurable: true,
  value: () => document.body,
});
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
});
