import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTauriRuntime } from '../project/api';
import {
  importFont,
  listImportedFonts,
  listSystemFonts,
  readFontBytes,
  removeImportedFont,
} from './api';
import { DEFAULT_FONT, type FontConfig, type FontRecord, type FontSelection } from './types';

const STORAGE_KEY = 'paperscape.fontConfig';
const UI_FALLBACK = '"Microsoft YaHei UI", "Segoe UI", "PingFang SC", sans-serif';
const EDITOR_FALLBACK = '"Microsoft YaHei UI", "Segoe UI", "PingFang SC", serif';

function readConfig(): FontConfig {
  const fallback: FontConfig = { ui: DEFAULT_FONT, editor: DEFAULT_FONT };
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    const normalize = (value: unknown): FontSelection => {
      if (!value || typeof value !== 'object') return DEFAULT_FONT;
      const item = value as Partial<FontSelection>;
      if (typeof item.name !== 'string' || !item.name.trim()) return DEFAULT_FONT;
      if (item.source !== 'system' && item.source !== 'imported' && item.source !== 'default') {
        return DEFAULT_FONT;
      }
      return {
        name: item.name,
        source: item.source,
        id: typeof item.id === 'string' ? item.id : undefined,
        path: typeof item.path === 'string' ? item.path : undefined,
      };
    };
    return { ui: normalize(parsed.ui), editor: normalize(parsed.editor) };
  } catch {
    return fallback;
  }
}

function quoteFamily(name: string): string {
  return `"${name.replace(/["\\]/g, '')}"`;
}

export function useFonts() {
  const [config, setConfigState] = useState<FontConfig>(readConfig);
  const [systemFonts, setSystemFonts] = useState<FontRecord[]>([]);
  const [importedFonts, setImportedFonts] = useState<FontRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(new Map<string, string>());

  const persist = useCallback((next: FontConfig) => {
    setConfigState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const loadImported = useCallback(async (selection: FontSelection): Promise<string> => {
    if (selection.source !== 'imported' || !selection.id || !selection.path) return selection.name;
    const cached = loadedRef.current.get(selection.id);
    if (cached) return cached;
    if (!isTauriRuntime()) throw new Error('字体加载需要桌面应用环境');
    if (typeof FontFace === 'undefined') throw new Error('当前环境不支持字体加载');
    const bytes = await readFontBytes(selection.path, 'imported');
    const family = `PaperScapeUser_${selection.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const face = new FontFace(family, new Uint8Array(bytes));
    await face.load();
    document.fonts.add(face);
    loadedRef.current.set(selection.id, family);
    return family;
  }, []);

  const apply = useCallback(async () => {
    try {
      const [uiFamily, editorFamily] = await Promise.all([
        config.ui.source === 'imported' ? loadImported(config.ui) : Promise.resolve(config.ui.name),
        config.editor.source === 'imported'
          ? loadImported(config.editor)
          : Promise.resolve(config.editor.name),
      ]);
      document.documentElement.style.setProperty(
        '--font-ui',
        `${quoteFamily(uiFamily)}, ${UI_FALLBACK}`,
      );
      document.documentElement.style.setProperty(
        '--font-editor',
        `${quoteFamily(editorFamily)}, ${EDITOR_FALLBACK}`,
      );
      setError('');
    } catch (fontError) {
      document.documentElement.style.setProperty('--font-ui', UI_FALLBACK);
      document.documentElement.style.setProperty('--font-editor', EDITOR_FALLBACK);
      setError(
        fontError instanceof Error
          ? `${fontError.message}；已回退到系统字体`
          : '字体加载失败，已回退到系统字体',
      );
    }
  }, [config.editor, config.ui, loadImported]);

  useEffect(() => {
    void apply();
  }, [apply]);

  const setFont = useCallback(
    (target: 'ui' | 'editor', selection: FontSelection) => {
      persist({ ...config, [target]: selection });
    },
    [config, persist],
  );

  const resetFont = useCallback(
    (target: 'ui' | 'editor') => {
      persist({ ...config, [target]: DEFAULT_FONT });
    },
    [config, persist],
  );

  const loadFontLists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [system, imported] = await Promise.all([listSystemFonts(), listImportedFonts()]);
      setSystemFonts(system);
      setImportedFonts(imported);
    } catch (fontError) {
      setError(fontError instanceof Error ? fontError.message : '读取系统字体失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const importUserFont = useCallback(async (): Promise<FontRecord | null> => {
    setLoading(true);
    setError('');
    try {
      const record = await importFont();
      if (record) {
        setImportedFonts((current) => [...current.filter((font) => font.id !== record.id), record]);
      }
      return record;
    } catch (fontError) {
      setError(fontError instanceof Error ? fontError.message : '导入字体失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFont = useCallback(
    async (id: string) => {
      setLoading(true);
      setError('');
      try {
        await removeImportedFont(id);
        setImportedFonts((current) => current.filter((font) => font.id !== id));
        persist({
          ui: config.ui.id === id ? DEFAULT_FONT : config.ui,
          editor: config.editor.id === id ? DEFAULT_FONT : config.editor,
        });
      } catch (fontError) {
        setError(fontError instanceof Error ? fontError.message : '移除字体失败');
      } finally {
        setLoading(false);
      }
    },
    [config.editor, config.ui, persist],
  );

  const previewFamily = useCallback(
    async (record: FontRecord): Promise<string> => {
      if (record.source === 'system') return record.name;
      return loadImported({
        name: record.name,
        source: 'imported',
        id: record.id,
        path: record.path,
      });
    },
    [loadImported],
  );

  const fonts = useMemo(
    () => [
      ...importedFonts,
      ...systemFonts.filter(
        (system) => !importedFonts.some((font) => font.name.toLowerCase() === system.name.toLowerCase()),
      ),
    ],
    [importedFonts, systemFonts],
  );

  return {
    config,
    fonts,
    systemFonts,
    importedFonts,
    loading,
    error,
    setFont,
    resetFont,
    loadFontLists,
    importUserFont,
    removeFont,
    previewFamily,
    clearError: () => setError(''),
  };
}
