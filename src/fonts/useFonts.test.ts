import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFonts } from './useFonts';

describe('font settings', () => {
  it('applies separate UI and writing fonts and persists them', async () => {
    localStorage.clear();
    const { result } = renderHook(() => useFonts());
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--font-ui')).toContain('Microsoft YaHei UI'));

    act(() =>
      result.current.setFont('editor', {
        name: 'SimSun',
        source: 'system',
      }),
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--font-editor')).toContain('SimSun');
      expect(document.documentElement.style.getPropertyValue('--font-ui')).toContain('Microsoft YaHei UI');
      expect(localStorage.getItem('paperscape.fontConfig')).toContain('SimSun');
    });

    act(() => result.current.resetFont('editor'));
    await waitFor(() => expect(result.current.config.editor.name).toBe('Microsoft YaHei UI'));
  });
});
