import { invoke } from '@tauri-apps/api/core';
import type {
  RecentItem,
  WorkspaceDocxPayload,
  WorkspaceNode,
  WorkspaceSaveResult,
} from './types';

export function chooseWorkspaceFolder(): Promise<string | null> {
  return invoke<string | null>('choose_workspace_folder');
}

export function chooseWorkspaceDocx(): Promise<string | null> {
  return invoke<string | null>('choose_workspace_docx');
}

export function authorizeWorkspacePath(path: string): Promise<string> {
  return invoke<string>('authorize_workspace_path', { path });
}

export function listWorkspaceTree(root: string): Promise<WorkspaceNode[]> {
  return invoke<WorkspaceNode[]>('list_workspace_tree', { root });
}

export function readWorkspaceDocx(path: string): Promise<WorkspaceDocxPayload> {
  return invoke<WorkspaceDocxPayload>('read_workspace_docx', { path });
}

export function statWorkspaceDocx(path: string): Promise<[number, number]> {
  return invoke<[number, number]>('stat_workspace_docx', { path });
}

export function writeWorkspaceDocx(
  path: string,
  bytes: Uint8Array,
  expectedModified: number,
  expectedSize: number,
): Promise<WorkspaceSaveResult> {
  return invoke<WorkspaceSaveResult>('write_workspace_docx', {
    path,
    bytes: Array.from(bytes),
    expectedModified,
    expectedSize,
  });
}

export function writeWorkspaceDocxAs(
  path: string,
  bytes: Uint8Array,
): Promise<WorkspaceSaveResult> {
  return invoke<WorkspaceSaveResult>('write_workspace_docx_as', {
    path,
    bytes: Array.from(bytes),
  });
}

export function chooseWorkspaceSavePath(
  title: string,
  defaultName: string,
  initialDir: string,
): Promise<string | null> {
  return invoke<string | null>('choose_workspace_save_path', {
    title,
    defaultName,
    initialDir,
  });
}

export function revealWorkspacePath(path: string): Promise<void> {
  return invoke<void>('reveal_workspace_path', { path });
}

export function getDefaultDocumentsDir(): Promise<string> {
  return invoke<string>('default_documents_dir');
}

export function listRecentItems(): Promise<RecentItem[]> {
  return invoke<RecentItem[]>('recent_items_list');
}

export function addRecentItem(kind: RecentItem['kind'], path: string): Promise<void> {
  return invoke<void>('recent_item_add', { kind, path });
}

export function saveDocxRecovery(key: string, payload: unknown): Promise<string> {
  return invoke<string>('save_docx_recovery', { key, payload });
}

export function loadDocxRecovery<T>(key: string): Promise<T | null> {
  return invoke<T | null>('load_docx_recovery', { key });
}

export function clearDocxRecovery(key: string): Promise<void> {
  return invoke<void>('clear_docx_recovery', { key });
}
