import { useCallback, useState } from 'react';

const ENABLED_KEY = 'paperscape.proofreading.enabled';
const DICTIONARY_KEY = 'paperscape.proofreading.dictionary';
const IGNORED_KEY = 'paperscape.proofreading.ignored';
const MAX_DICTIONARY = 300;
const MAX_IGNORED = 500;

function readStringArray(key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    return [];
  }
}

function readEnabled(): boolean {
  return window.localStorage.getItem(ENABLED_KEY) !== 'false';
}

export function useProofreading() {
  const [enabled, setEnabledState] = useState(readEnabled);
  const [dictionary, setDictionaryState] = useState(() => readStringArray(DICTIONARY_KEY));
  const [ignored, setIgnoredState] = useState(() => readStringArray(IGNORED_KEY));

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    window.localStorage.setItem(ENABLED_KEY, String(value));
  }, []);

  const addDictionary = useCallback((word: string) => {
    const cleaned = word.trim();
    if (!cleaned) return;
    setDictionaryState((current) => {
      if (current.includes(cleaned) || current.length >= MAX_DICTIONARY) return current;
      const next = [...current, cleaned];
      window.localStorage.setItem(DICTIONARY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const ignore = useCallback((fingerprint: string) => {
    if (!fingerprint) return;
    setIgnoredState((current) => {
      if (current.includes(fingerprint) || current.length >= MAX_IGNORED) return current;
      const next = [...current, fingerprint];
      window.localStorage.setItem(IGNORED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearDictionary = useCallback(() => {
    setDictionaryState([]);
    window.localStorage.removeItem(DICTIONARY_KEY);
  }, []);

  const clearIgnored = useCallback(() => {
    setIgnoredState([]);
    window.localStorage.removeItem(IGNORED_KEY);
  }, []);

  return {
    enabled,
    dictionary,
    ignored,
    setEnabled,
    addDictionary,
    ignore,
    clearDictionary,
    clearIgnored,
  };
}

export type ProofreadingState = ReturnType<typeof useProofreading>;
