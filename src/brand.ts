import { getVersion } from '@tauri-apps/api/app';
import packageJson from '../package.json';
import { isTauriEnvironment } from './lib/window';

/**
 * PaperScape 纸境 — brand and copyright information.
 *
 * This file records product identity only. It does not add or change any
 * software license. Third-party components keep their own licenses.
 */
export const BRAND = {
  nameZh: '纸境',
  nameEn: 'PaperScape',
  creator: 'QuillLulu',
  copyright: 'Copyright © 2026 QuillLulu',
  createdBy: 'Created by QuillLulu',
  tagline: '独立设计 · AI 辅助开发',
  fallbackVersion: packageJson.version,
} as const;

/** Read the version from the running Tauri app, with the package version as a browser/test fallback. */
export async function readAppVersion(): Promise<string> {
  if (!isTauriEnvironment()) return BRAND.fallbackVersion;
  try {
    return await getVersion();
  } catch {
    return BRAND.fallbackVersion;
  }
}
