import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUiZoom } from './useUiZoom';
import { clampDocZoom, useDocumentZoom } from './useDocumentZoom';

describe('interface and document zoom', () => {
  it('clamps document zoom to 50–200%', () => {
    expect(clampDocZoom(10)).toBe(50);
    expect(clampDocZoom(240)).toBe(200);
    expect(clampDocZoom(114)).toBe(110);
    expect(clampDocZoom(Number.NaN)).toBe(100);
  });

  it('persists UI zoom and exposes it as a CSS variable', async () => {
    localStorage.clear();
    const { result } = renderHook(() => useUiZoom());
    await waitFor(() => expect(result.current.uiZoom).toBe(110));
    act(() => result.current.setUiZoom(150));
    await waitFor(() => {
      expect(result.current.uiZoom).toBe(150);
      expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.5');
      expect(localStorage.getItem('paperscape.uiZoom')).toBe('150');
    });
  });

  it('persists document zoom independently from UI zoom', async () => {
    localStorage.clear();
    const { result } = renderHook(() => useDocumentZoom());
    act(() => result.current.setDocZoom(120));
    await waitFor(() => {
      expect(result.current.docZoom).toBe(120);
      expect(localStorage.getItem('paperscape.documentZoom')).toBe('120');
      expect(localStorage.getItem('paperscape.uiZoom')).toBeNull();
    });
    act(() => result.current.resetDocZoom());
    await waitFor(() => expect(result.current.docZoom).toBe(100));
  });
});
