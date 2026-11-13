import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { ChapterFile } from '../project/types';
import { EMPTY_DOC } from '../project/types';
import { inspectDocxRisk } from '../docx/inspectDocx';
import type { DocxRisk, OpenDocxState, RecentItem, WorkspaceNode } from './types';
import {
  addRecentItem,
  authorizeWorkspacePath,
  chooseWorkspaceDocx,
  chooseWorkspaceFolder,
  chooseWorkspaceSavePath,
  clearDocxRecovery,
  getDefaultDocumentsDir,
  listRecentItems,
  listWorkspaceTree,
  loadDocxRecovery,
  readWorkspaceDocx,
  saveDocxRecovery,
  statWorkspaceDocx,
  writeWorkspaceDocx,
  writeWorkspaceDocxAs,
} from './api';

export interface RecoveryDraft {
  savedAt: number;
  path: string | null;
  name: string;
  title: string;
  doc: JSONContent;
  characterCount: number;
  excerpt: string;
}
export interface DocumentWorkspace {
  root: string | null;
  tree: WorkspaceNode[];
  document: OpenDocxState | null;
  recentItems: RecentItem[];
  defaultDocumentsDir: string;
  setDefaultDocumentsDir: (path: string) => void;
  loading: boolean;
  saving: boolean;
  error: string;
  recovery: RecoveryDraft | null;
  recoveryError: string;
  isOpen: boolean;
  openFolder: (path?: string) => Promise<boolean>;
  openDocx: (path?: string) => Promise<boolean>;
  openPath: (path: string) => Promise<boolean>;
  newDocument: () => void;
  closeDocument: () => Promise<void>;
  closeWorkspace: () => Promise<void>;
  refreshTree: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  updateDocument: (
    patch: Partial<Pick<OpenDocxState, 'title' | 'doc' | 'characterCount' | 'excerpt'>>,
  ) => void;
  save: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  authorizeOverwrite: () => void;
  toggleReadOnly: () => void;
  restoreRecovery: () => void;
  discardRecovery: () => void;
  clearError: () => void;
  editorChapter: ChapterFile | null;
}

const EMPTY_RISK: DocxRisk = { safeToOverwrite: true, warnings: [] };

export function parentPath(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
  return index > 0 ? normalized.slice(0, index) : normalized;
}

export function baseName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function fileTitle(name: string): string {
  return name.replace(/\.docx$/i, '') || '未命名文稿';
}

function emptyDocument(): OpenDocxState {
  return {
    path: null,
    name: '未命名.docx',
    title: '未命名文稿',
    doc: structuredClone(EMPTY_DOC),
    characterCount: 0,
    excerpt: '',
    modified: 0,
    size: 0,
    risk: EMPTY_RISK,
    readOnly: false,
    overwriteAuthorized: false,
    backupPath: '',
    dirty: false,
    savedAt: 0,
    root: null,
  };
}

export function useDocumentWorkspace(autoSave = true): DocumentWorkspace {
  const [root, setRoot] = useState<string | null>(null);
  const [tree, setTree] = useState<WorkspaceNode[]>([]);
  const [document, setDocument] = useState<OpenDocxState | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [defaultDocumentsDir, setDefaultDir] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const autoSaveFailedDocRef = useRef<JSONContent | null>(null);
  const [recovery, setRecovery] = useState<RecoveryDraft | null>(null);
  const [recoveryError, setRecoveryError] = useState('');

  const refreshRecent = useCallback(async () => {
    try {
      setRecentItems(await listRecentItems());
    } catch {
      // Recent items are a convenience; failing to read them must not block editing.
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
    const saved = window.localStorage.getItem('paperscape.defaultDocumentsDir');
    if (saved) setDefaultDir(saved);
    void getDefaultDocumentsDir()
      .then((value) => setDefaultDir((current) => current || value))
      .catch(() => undefined);
  }, [refreshRecent]);

  const setDefaultDocumentsDir = useCallback((path: string) => {
    setDefaultDir(path);
    window.localStorage.setItem('paperscape.defaultDocumentsDir', path);
  }, []);

  const refreshTree = useCallback(async () => {
    if (!root) return;
    try {
      setTree(await listWorkspaceTree(root));
    } catch (treeError) {
      setError(treeError instanceof Error ? treeError.message : '读取文件夹失败');
    }
  }, [root]);

  const loadRecovery = useCallback(async (key: string) => {
    try {
      const value = await loadDocxRecovery<RecoveryDraft>(key);
      setRecovery(value);
    } catch {
      setRecovery(null);
    }
  }, []);

  const openFolder = useCallback(
    async (path?: string) => {
      setLoading(true);
      setError('');
      try {
        const selected = path ? (await authorizeWorkspacePath(path), path) : await chooseWorkspaceFolder();
        if (!selected) return false;
        const nodes = await listWorkspaceTree(selected);
        setRoot(selected);
        setTree(nodes);
        setDocument(null);
        setRecovery(null);
        await addRecentItem('folder', selected);
        await refreshRecent();
        return true;
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : '打开文件夹失败');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshRecent],
  );

  const openDocx = useCallback(
    async (path?: string) => {
      setLoading(true);
      setError('');
      try {
        if (path) await authorizeWorkspacePath(path);
        const selected = path ?? (await chooseWorkspaceDocx());
        if (!selected) return false;
        const payload = await readWorkspaceDocx(selected);
        const bytes = new Uint8Array(payload.bytes);
        const { importDocx } = await import('../docx/importDocx');
        const file = new File([bytes as BlobPart], payload.name, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const [imported, risk] = await Promise.all([
          importDocx(file),
          inspectDocxRisk(bytes),
        ]);
        const title = fileTitle(payload.name);
        const recoveryKey = payload.path;
        await loadRecovery(recoveryKey);
        setRoot(parentPath(payload.path));
        setTree(await listWorkspaceTree(parentPath(payload.path)));
        setDocument({
          path: payload.path,
          name: payload.name,
          title,
          doc: imported.doc,
          characterCount: imported.characterCount,
          excerpt: imported.excerpt,
          modified: payload.modified,
          size: payload.size,
          risk,
          readOnly: false,
          overwriteAuthorized: false,
          backupPath: '',
          dirty: false,
          savedAt: Date.now(),
          root: parentPath(payload.path),
        });
        await addRecentItem('docx', payload.path);
        await refreshRecent();
        return true;
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : '打开 Word 文档失败');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadRecovery, refreshRecent],
  );

  const openPath = useCallback(
    async (path: string) => {
      if (/\.docx$/i.test(path)) return openDocx(path);
      return openFolder(path);
    },
    [openDocx, openFolder],
  );

  const newDocument = useCallback(() => {
    setError('');
    setRecovery(null);
    setRoot(null);
    setTree([]);
    setDocument(emptyDocument());
  }, []);

  const closeDocument = useCallback(async () => {
    if (document?.dirty) {
      try {
        await saveDocxRecovery(document.path ?? 'untitled', {
          savedAt: Date.now(),
          path: document.path,
          name: document.name,
          title: document.title,
          doc: document.doc,
          characterCount: document.characterCount,
          excerpt: document.excerpt,
        });
      } catch (recoverySaveError) {
        setRecoveryError(
          recoverySaveError instanceof Error ? recoverySaveError.message : '恢复草稿保存失败',
        );
      }
    }
    setDocument(null);
    setRecovery(null);
  }, [document]);

  const closeWorkspace = useCallback(async () => {
    await closeDocument();
    setRoot(null);
    setTree([]);
  }, [closeDocument]);

  const updateDocument = useCallback(
    (patch: Partial<Pick<OpenDocxState, 'title' | 'doc' | 'characterCount' | 'excerpt'>>) => {
      setDocument((current) => (current ? { ...current, ...patch, dirty: true } : current));
    },
    [],
  );

  const buildBytes = useCallback(async (current: OpenDocxState): Promise<Uint8Array> => {
    const { buildDocxBlob } = await import('../docx/exportDocx');
    const { blob } = await buildDocxBlob(
      [{ title: current.title, doc: current.doc }],
      {
        preset: 'standard',
        pageSize: 'A4',
        fontFamily: 'Calibri',
        fontSize: 11,
        includeTitle: false,
      },
    );
    return new Uint8Array(await blob.arrayBuffer());
  }, []);

  const saveAs = useCallback(async (): Promise<boolean> => {    if (!document) return false;
    setSaving(true);
    setError('');
    try {
      const dir = defaultDocumentsDir || (await getDefaultDocumentsDir());
      const chosen = await chooseWorkspaceSavePath(
        '保存 Word 文档',
        document.name || '未命名.docx',
        dir,
      );
      if (!chosen) return false;
      const target = chosen.toLowerCase().endsWith('.docx') ? chosen : `${chosen}.docx`;
      const bytes = await buildBytes(document);
      const result = await writeWorkspaceDocxAs(target, bytes);
      const parent = parentPath(result.path);
      setDocument((current) =>
        current
          ? {
              ...current,
              path: result.path,
              name: baseName(result.path),
              modified: result.modified,
              size: result.size,
              backupPath: result.backupPath ?? '',
              overwriteAuthorized: false,
              dirty: false,
              savedAt: Date.now(),
              root: parent,
            }
          : current,
      );
      setRoot(parent);
      setTree(await listWorkspaceTree(parent));
      if (document.path) await clearDocxRecovery(document.path);
      await clearDocxRecovery(result.path);
      setRecovery(null);
      await addRecentItem('docx', result.path);
      await refreshRecent();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '另存为失败');
      return false;
    } finally {
      setSaving(false);
    }
  }, [buildBytes, defaultDocumentsDir, document, refreshRecent]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!document) return false;
    if (document.readOnly) {
      setError('当前文档为只读模式，请使用“另存为”');
      return false;
    }
    if (document.path && !document.risk.safeToOverwrite && !document.overwriteAuthorized) {
      setError('文档包含当前流程无法完整保留的格式，必须选择“另存为”或明确授权覆盖');
      return false;
    }
    if (!document.path) return saveAs();
    setSaving(true);
    setError('');
    try {
      const [modified, size] = await statWorkspaceDocx(document.path);
      if (modified !== document.modified || size !== document.size) {
        setError('文件已被外部程序修改，已阻止无提示覆盖；请重新加载或另存为');
        return false;
      }
      const bytes = await buildBytes(document);
      const result = await writeWorkspaceDocx(
        document.path,
        bytes,
        document.modified,
        document.size,
      );
      setDocument((current) =>
        current
          ? {
              ...current,
              modified: result.modified,
              size: result.size,
              backupPath: result.backupPath ?? current.backupPath,
              dirty: false,
              savedAt: Date.now(),
            }
          : current,
      );
      await clearDocxRecovery(document.path);
      setRecovery(null);
      await addRecentItem('docx', result.path);
      await refreshRecent();
      return true;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '保存 Word 文档失败';
      setError(message);
      try {
        await saveDocxRecovery(document.path, {
          savedAt: Date.now(),
          path: document.path,
          name: document.name,
          title: document.title,
          doc: document.doc,
          characterCount: document.characterCount,
          excerpt: document.excerpt,
        });
        setRecoveryError('');
      } catch (recoverySaveError) {
        setRecoveryError(
          recoverySaveError instanceof Error ? recoverySaveError.message : '恢复草稿保存失败',
        );
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [buildBytes, document, refreshRecent, saveAs]);

  const authorizeOverwrite = useCallback(() => {
    setDocument((current) => (current ? { ...current, overwriteAuthorized: true } : current));
  }, []);

  const toggleReadOnly = useCallback(() => {
    setDocument((current) => (current ? { ...current, readOnly: !current.readOnly } : current));
  }, []);

  const restoreRecovery = useCallback(() => {
    if (!recovery) return;
    setDocument((current) =>
      current
        ? {
            ...current,
            doc: recovery.doc,
            characterCount: recovery.characterCount,
            excerpt: recovery.excerpt,
            title: recovery.title,
            dirty: true,
          }
        : current,
    );
    setRecovery(null);
  }, [recovery]);

  const discardRecovery = useCallback(() => {
    if (document?.path) void clearDocxRecovery(document.path);
    setRecovery(null);
  }, [document?.path]);

  useEffect(() => {
    if (!document?.dirty) return;
    const key = document.path ?? 'untitled';
    const timer = window.setTimeout(() => {
      const payload: RecoveryDraft = {
        savedAt: Date.now(),
        path: document.path,
        name: document.name,
        title: document.title,
        doc: document.doc,
        characterCount: document.characterCount,
        excerpt: document.excerpt,
      };
      void saveDocxRecovery(key, payload)
        .then(() => setRecoveryError(''))
        .catch((saveError: unknown) => {
          setRecoveryError(
            saveError instanceof Error ? saveError.message : '自动恢复草稿保存失败',
          );
        });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [document?.characterCount, document?.dirty, document?.doc, document?.name, document?.path, document?.title]);

  useEffect(() => {
    if (
      !autoSave ||
      !document?.dirty ||
      !document.path ||
      document.readOnly ||
      saving ||
      autoSaveFailedDocRef.current === document.doc ||
      (!document.risk.safeToOverwrite && !document.overwriteAuthorized)
    ) {
      return;
    }
    const documentAtSchedule = document.doc;
    const timer = window.setTimeout(() => {
      void save().then((ok) => {
        if (!ok) autoSaveFailedDocRef.current = documentAtSchedule;
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    autoSave,
    document?.characterCount,
    document?.dirty,
    document?.overwriteAuthorized,
    document?.path,
    document?.readOnly,
    document?.risk.safeToOverwrite,
    save,
    saving,
  ]);

  const editorChapter = useMemo<ChapterFile | null>(() => {
    if (!document) return null;
    return {
      version: 1,
      id: document.path ?? 'untitled-docx',
      title: document.title,
      doc: document.doc,
      updatedAt: Date.now(),
      characterCount: document.characterCount,
      excerpt: document.excerpt,
    };
  }, [document]);

  return {
    root,
    tree,
    document,
    recentItems,
    defaultDocumentsDir,
    setDefaultDocumentsDir,
    loading,
    saving,
    error,
    recovery,
    recoveryError,
    isOpen: Boolean(root || document),
    openFolder,
    openDocx,
    openPath,
    newDocument,
    closeDocument,
    closeWorkspace,
    refreshTree,
    refreshRecent,
    updateDocument,
    save,
    saveAs,
    authorizeOverwrite,
    toggleReadOnly,
    restoreRecovery,
    discardRecovery,
    clearError: () => setError(''),
    editorChapter,
  };
}
