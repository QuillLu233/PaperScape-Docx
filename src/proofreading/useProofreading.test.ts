import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProofreading } from './useProofreading';

describe('proofreading preferences', () => {
  it('persists the switch, dictionary and ignored fingerprints', () => {
    localStorage.clear();
    const { result } = renderHook(() => useProofreading());
    expect(result.current.enabled).toBe(true);
    expect(result.current.dictionary).toHaveLength(0);

    act(() => result.current.setEnabled(false));
    act(() => result.current.addDictionary('纸境'));
    act(() => result.current.addDictionary('纸境'));
    act(() => result.current.ignore('repeated-char\u0002的的\u0002上下文'));

    expect(result.current.enabled).toBe(false);
    expect(result.current.dictionary).toEqual(['纸境']);
    expect(result.current.ignored).toHaveLength(1);
    expect(localStorage.getItem('paperscape.proofreading.enabled')).toBe('false');
    expect(localStorage.getItem('paperscape.proofreading.dictionary')).toContain('纸境');

    act(() => result.current.clearDictionary());
    act(() => result.current.clearIgnored());
    expect(result.current.dictionary).toHaveLength(0);
    expect(result.current.ignored).toHaveLength(0);
  });
});
