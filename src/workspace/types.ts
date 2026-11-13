import type { JSONContent } from '@tiptap/core';

export interface WorkspaceNode {
  name: string;
  path: string;
  isDir: boolean;
  editable: boolean;
  isProject: boolean;
  extension: string;
  size: number;
  modified: number;
  children: WorkspaceNode[];
}

export interface WorkspaceDocxPayload {
  path: string;
  name: string;
  bytes: number[];
  modified: number;
  size: number;
}

export interface WorkspaceSaveResult {
  path: string;
  modified: number;
  size: number;
  backupPath: string | null;
}

export interface RecentItem {
  kind: 'project' | 'docx' | 'folder';
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface DocxRisk {
  safeToOverwrite: boolean;
  warnings: string[];
}

export interface OpenDocxState {
  path: string | null;
  name: string;
  title: string;
  doc: JSONContent;
  characterCount: number;
  excerpt: string;
  modified: number;
  size: number;
  risk: DocxRisk;
  readOnly: boolean;
  overwriteAuthorized: boolean;
  backupPath: string;
  dirty: boolean;
  savedAt: number;
  root: string | null;
}
