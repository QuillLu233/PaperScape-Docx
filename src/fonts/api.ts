import { invoke } from '@tauri-apps/api/core';
import type { FontRecord } from './types';

export function listSystemFonts(): Promise<FontRecord[]> {
  return invoke<FontRecord[]>('list_system_fonts');
}

export function listImportedFonts(): Promise<FontRecord[]> {
  return invoke<FontRecord[]>('list_imported_fonts');
}

export function importFont(): Promise<FontRecord | null> {
  return invoke<FontRecord | null>('import_font');
}

export function removeImportedFont(id: string): Promise<void> {
  return invoke<void>('remove_imported_font', { id });
}

export function readFontBytes(path: string, source: string): Promise<number[]> {
  return invoke<number[]>('read_font_bytes', { path, source });
}
