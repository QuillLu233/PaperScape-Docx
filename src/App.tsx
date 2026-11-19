/*
 * PaperScape 纸境
 * Copyright © 2026 QuillLulu
 * Created by QuillLulu
 */
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BackgroundLayer } from './components/BackgroundLayer';
import { ChapterSidebar } from './components/ChapterSidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DocumentBar } from './components/DocumentBar';
import { DocxExportDialog } from './components/DocxExportDialog';
import { FileTree } from './components/FileTree';
import { ImportDocxDialog } from './components/ImportDocxDialog';
import { AboutDialog, ShortcutsDialog } from './components/Dialogs';
import { EditorPane, type EditorPaneHandle } from './components/EditorPane';
import { FocusOverlay } from './components/FocusOverlay';
import { HistoryDialog } from './components/HistoryDialog';
import { Icon } from './components/Icon';
import { MenuBar } from './components/MenuBar';
import { ProjectLauncher } from './components/ProjectLauncher';
import { RenameChapterDialog } from './components/RenameChapterDialog';
import { ResizeHandles } from './components/ResizeHandles';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { useProjectAppearance } from './appearance/useProjectAppearance';
import { DEFAULT_APPEARANCE } from './appearance/presets';
import { loadProjectAppearance, saveProjectAppearance } from './appearance/storage';
import { DEFAULT_SETTINGS } from './types';
import type { ProjectAppearance } from './types';
import type { DocxExportOptions } from './docx/exportDocx';
import type { ImportedDocx } from './docx/importDocx';
import type { SaveMode } from './types';
import { chooseDocxOpenPath, chooseDocxSavePath, chooseFolder, isTauriRuntime, readDocxFile, saveDocxExport } from './project/api';
import { revealWorkspacePath } from './workspace/api';
import { baseName, useDocumentWorkspace } from './workspace/useDocumentWorkspace';
import { useWorkspaceDrop } from './workspace/useWorkspaceDrop';
import type { RecentItem, WorkspaceNode } from './workspace/types';
import { usePanels } from './hooks/usePanels';
import { useTheme } from './hooks/useTheme';
import { applyEnvironmentCss, clearEnvironmentCss, resolveUiTheme } from './appearance/themeRuntime';
import { useUiZoom } from './hooks/useUiZoom';
import { useDocumentZoom } from './hooks/useDocumentZoom';
import { useWindowState } from './hooks/useWindowState';
import { useProject } from './project/useProject';
import { useFonts } from './fonts/useFonts';
import { FontManagerDialog } from './components/FontManagerDialog';
import { useProofreading } from './proofreading/useProofreading';
import type { ChapterSummary, HistoryEntry, RecoveryCandidate } from './project/types';

type DialogName = 'shortcuts' | 'about' | null;

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function hasImageFile(event: DragEvent<HTMLElement>): boolean {
  const items = Array.from(event.dataTransfer.items);
  if (items.length > 0) {
    return items.some((item) => item.kind === 'file' && item.type.startsWith('image/'));
  }
  return Array.from(event.dataTransfer.files).some((file) => file.type.startsWith('image/'));
}

export default function App() {
  const [saveMode, setSaveMode] = useState<SaveMode>(() =>
    window.localStorage.getItem('paperscape.saveMode') === 'manual' ? 'manual' : 'auto',
  );
  const [documentBarAutoCollapse, setDocumentBarAutoCollapse] = useState(
    () => window.localStorage.getItem('paperscape.documentBarAutoCollapse') !== 'false',
  );
  const projectController = useProject(saveMode === 'auto');
  const documentController = useDocumentWorkspace(saveMode === 'auto');
  const {
    recentItems,
    document: activeDocument,
    root: documentRoot,
    tree: documentTree,
    loading: documentLoading,
    saving: documentSaving,
    error: documentError,
    recovery: documentRecovery,
    recoveryError: documentRecoveryError,
    openFolder,
    openDocx,
    openPath,
    newDocument,
    closeDocument,
    closeWorkspace,
    refreshTree,
    updateDocument,
    save: saveDocument,
    saveAs: saveDocumentAs,
    authorizeOverwrite,
    toggleReadOnly,
    restoreRecovery: restoreDocumentRecovery,
    discardRecovery: discardDocumentRecovery,
    clearError: clearDocumentError,
    editorChapter,
    defaultDocumentsDir,
    setDefaultDocumentsDir,
    isOpen: isDocumentMode,
  } = documentController;
  const {
    recent,
    project,
    chapters,
    activeChapter,
    activeIndex,
    documentRevision,
    loading,
    saving,
    savedAt,
    dirty,
    error,
    warnings,
    recovery,
    createProject,
    openProject,
    openRecent,
    importLegacy,
    closeProject,
    selectChapter,
    updateActiveChapter,
    addChapter,
    addChapterWithContent,
    loadExportChapters,
    renameChapter,
    moveChapter,
    deleteChapter,
    saveNow,
    updateSettings,
    updateAppearance,
    history,
    restoreHistory,
    restoreRecovery,
    discardRecovery,
    dismissWarning,
    clearError,
    projectPath,
  } = projectController;
  const { mode: themeMode, resolved: themeResolved, setMode: setThemeMode } = useTheme();
  const fonts = useFonts();
  const proofreading = useProofreading();
  const { uiZoom, setUiZoom } = useUiZoom();
  const { docZoom, setDocZoom, resetDocZoom } = useDocumentZoom();
  const { leftOpen, rightOpen, toggleLeft, toggleRight, setLeftOpen } = usePanels();
  const { isMaximized, isFullscreen, isDesktop, minimize, toggleMaximize, toggleFullscreen, close } =
    useWindowState();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [fontManagerOpen, setFontManagerOpen] = useState(false);
  const [documentAppearance, setDocumentAppearance] = useState<ProjectAppearance>(() =>
    loadProjectAppearance('__document__'),
  );
  const [focusMode, setFocusMode] = useState(false);
  const focusAutoFullscreenRef = useRef(false);
  const previousFocusModeRef = useRef(false);
  const [documentBarCollapsed, setDocumentBarCollapsed] = useState(
    () => window.localStorage.getItem('paperscape.documentBarCollapsed') === 'true',
  );
  const [focusPaperOpacity, setFocusPaperOpacity] = useState(85);
  const [focusBrightness, setFocusBrightness] = useState(100);
  const [focusBlur, setFocusBlur] = useState(0);
  const [focusOverlay, setFocusOverlay] = useState(6);
  const focusShortcutGuard = useRef(0);
  const [openLastSession, setOpenLastSessionState] = useState(
    () => window.localStorage.getItem('paperscape.openLastSession') !== 'false',
  );
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState('');
  const [projectCreateRequest, setProjectCreateRequest] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ChapterSummary | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ChapterSummary | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<RecoveryCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [importedDocx, setImportedDocx] = useState<ImportedDocx | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const dragDepth = useRef(0);
  const editorRef = useRef<EditorPaneHandle>(null);
  const startupAttempted = useRef(false);
  const sessionActiveRef = useRef(false);
  sessionActiveRef.current = Boolean(project || documentRoot || activeDocument);

  const appearance = isDocumentMode
    ? documentAppearance
    : project?.appearance ?? DEFAULT_APPEARANCE;
  const settings = isDocumentMode ? DEFAULT_SETTINGS : project?.settings ?? DEFAULT_SETTINGS;
  const effectiveBackground = focusMode
    ? {
        ...appearance.background,
        brightness: focusBrightness,
        blur: focusBlur,
        overlay: focusOverlay,
      }
    : appearance.background;
  const effectiveAppearance = focusMode
    ? {
        ...appearance,
        mode: 'paper' as const,
        paper: { ...appearance.paper, opacity: focusPaperOpacity / 100 },
      }
    : appearance;
  const updateAppearanceInMode = useCallback(
    (next: ProjectAppearance) => {
      if (isDocumentMode) {
        setDocumentAppearance(next);
        saveProjectAppearance('__document__', next);
        return;
      }
      projectController.updateAppearance(next);
    },
    [isDocumentMode, updateAppearance],
  );
  const appearanceController = useProjectAppearance(appearance, updateAppearanceInMode);
  const {
    backgroundUrl,
    backgroundVideoUrl,
    savedThemes,
    environmentPresets,
    setMode: setWritingMode,
    updateBackground,
    setReadingOpacity,
    updatePaper,
    applyPreset,
    applySavedTheme,
    applyEnvironment,
    saveCurrentEnvironment,
    renameEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    exportEnvironment,
    importEnvironment,
    restoreDefaultEnvironment,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
    setBackgroundFromVideo,
    toggleBackgroundVideo,
  } = appearanceController;

  useEffect(() => {
    const environmentMode = appearance.uiColorMode === 'environment';
    const resolved = resolveUiTheme(
      appearance.uiColorMode,
      appearance.uiTheme,
      themeResolved,
    );
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute(
      'content',
      environmentMode ? appearance.uiColors.titlebar : resolved === 'dark' ? '#191b18' : '#f6f4ef',
    );
    if (environmentMode) applyEnvironmentCss(appearance.uiColors);
    else clearEnvironmentCss();
  }, [
    appearance.uiColorMode,
    appearance.uiColors,
    appearance.uiTheme,
    themeResolved,
  ]);

  const changeUiColorMode = useCallback(
    (mode: ProjectAppearance['uiColorMode']) => {
      if (mode !== 'environment') setThemeMode(mode);
      updateAppearanceInMode({
        ...appearance,
        uiColorMode: mode,
        uiColorModeExplicit: mode !== 'environment',
      });
    },
    [appearance, setThemeMode, updateAppearanceInMode],
  );

  const changeClassicTheme = useCallback(
    (mode: 'light' | 'dark' | 'system') => {
      setThemeMode(mode);
      updateAppearanceInMode({
        ...appearance,
        uiColorMode: mode,
        uiColorModeExplicit: true,
      });
    },
    [appearance, setThemeMode, updateAppearanceInMode],
  );

  const updateDisplay = useCallback(    (patch: Partial<ProjectAppearance['display']>) => {
      updateAppearanceInMode({ ...appearance, display: { ...appearance.display, ...patch } });
    },
    [appearance, updateAppearanceInMode],
  );

  const updateAnimation = useCallback(
    (patch: Partial<ProjectAppearance['animation']>) => {
      updateAppearanceInMode({
        ...appearance,
        animation: { ...appearance.animation, ...patch },
      });
    },
    [appearance, updateAppearanceInMode],
  );

  const isProjectOpen = Boolean(project && activeChapter);

  useEffect(() => {
    if (startupAttempted.current || !openLastSession || !isTauriRuntime()) return;
    const timer = window.setTimeout(() => {
      startupAttempted.current = true;
      if (sessionActiveRef.current) return;
      let last: { kind?: string; path?: string } | null = null;
      try {
        last = JSON.parse(window.localStorage.getItem('paperscape.lastSession') || 'null');
      } catch {
        last = null;
      }
      if (!last?.path || (last.kind !== 'project' && last.kind !== 'folder')) return;
      const restore =
        last.kind === 'project'
          ? openRecent(last.path)
          : openFolder(last.path);
      void restore.then((ok) => {
        if (ok) {
          setLeftOpen(true);
        } else {
          window.localStorage.removeItem('paperscape.lastSession');
        }
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [openFolder, openLastSession, openRecent, setLeftOpen]);

  const showNotice = useCallback((message: string) => setNotice(message), []);

  const rememberSession = useCallback((kind: 'project' | 'folder', path: string) => {
    window.localStorage.setItem(
      'paperscape.lastSession',
      JSON.stringify({ kind, path, at: Date.now() }),
    );
  }, []);

  const setOpenLastSession = useCallback((value: boolean) => {
    setOpenLastSessionState(value);
    window.localStorage.setItem('paperscape.openLastSession', value ? 'true' : 'false');
  }, []);

  useEffect(() => {
    if (projectPath) rememberSession('project', projectPath);
  }, [projectPath, rememberSession]);

  useEffect(() => {
    if (documentRoot) rememberSession('folder', documentRoot);
  }, [documentRoot, rememberSession]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!activeChapter?.id) return;
    const timer = window.setTimeout(() => editorRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [activeChapter?.id]);

  const toggleFocusMode = useCallback(() => {
    if (!isProjectOpen && !isDocumentMode) return;
    if (!focusMode) {
      setFocusPaperOpacity(85);
      setFocusBrightness(appearance.background.brightness);
      setFocusBlur(appearance.background.blur);
      setFocusOverlay(appearance.background.overlay);
    }
    setFocusMode((current) => !current);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, [
    appearance.background.blur,
    appearance.background.brightness,
    appearance.background.overlay,
    focusMode,
    isDocumentMode,
    isProjectOpen,
  ]);

  useEffect(() => {
    const wasFocused = previousFocusModeRef.current;
    previousFocusModeRef.current = focusMode;
    if (wasFocused === focusMode) return;
    if (focusMode) {
      if (isDesktop && !isFullscreen) {
        focusAutoFullscreenRef.current = true;
        void toggleFullscreen();
      }
      return;
    }
    if (focusAutoFullscreenRef.current) {
      focusAutoFullscreenRef.current = false;
      if (isDesktop && isFullscreen) void toggleFullscreen();
    }
  }, [focusMode, isDesktop, isFullscreen, toggleFullscreen]);

  const changeSaveMode = useCallback((mode: SaveMode) => {
    setSaveMode(mode);
    window.localStorage.setItem('paperscape.saveMode', mode);
    if (mode === 'manual') {
      setDocumentBarCollapsed(false);
      window.localStorage.setItem('paperscape.documentBarCollapsed', 'false');
    }
  }, []);

  const changeDocumentBarAutoCollapse = useCallback((value: boolean) => {
    setDocumentBarAutoCollapse(value);
    window.localStorage.setItem('paperscape.documentBarAutoCollapse', String(value));
  }, []);

  const toggleDocumentBar = useCallback(() => {
    setDocumentBarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('paperscape.documentBarCollapsed', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (
      saveMode !== 'auto' ||
      !isDocumentMode ||
      !activeDocument ||
      !documentBarAutoCollapse ||
      documentBarCollapsed ||
      focusMode ||
      activeDocument.dirty ||
      documentSaving ||
      documentError ||
      documentRecovery ||
      activeDocument.risk.warnings.length > 0
    ) {
      return;
    }
    const timer = window.setTimeout(() => setDocumentBarCollapsed(true), 6000);
    return () => window.clearTimeout(timer);
  }, [
    activeDocument,
    documentBarAutoCollapse,
    documentBarCollapsed,
    documentError,
    documentRecovery,
    documentSaving,
    focusMode,
    isDocumentMode,
    saveMode,
  ]);

  const toggleFocusFromShortcut = useCallback(() => {
    const now = Date.now();
    if (now - focusShortcutGuard.current < 160) return;
    focusShortcutGuard.current = now;
    toggleFocusMode();
  }, [toggleFocusMode]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    try {
      void listen('toggle-focus-shortcut', () => {
        toggleFocusFromShortcut();
      })
        .then((stop) => {
          if (disposed) stop();
          else unlisten = stop;
        })
        .catch(() => undefined);
    } catch {
      // Native accelerator is optional; the DOM shortcut remains a fallback.
    }
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [toggleFocusFromShortcut]);

  const changeWritingMode = useCallback(
    (mode: typeof appearance.mode) => {
      setWritingMode(mode);
      window.setTimeout(() => editorRef.current?.focus(), 0);
    },
    [setWritingMode],
  );

  const handleCreateChapter = useCallback(async () => {
    const ok = await addChapter();
    if (ok) window.setTimeout(() => editorRef.current?.focus(), 50);
  }, [addChapter]);

  const handleSelectChapter = useCallback(
    (id: string) => {
      if (!isProjectOpen || activeChapter?.id === id) return;
      void selectChapter(id).then((ok) => {
        if (ok) window.setTimeout(() => editorRef.current?.focus(), 50);
      });
    },
    [activeChapter?.id, isProjectOpen, selectChapter],
  );

  const handleCloseProject = useCallback(async () => {
    const ok = await closeProject();
    if (ok) showNotice('项目已保存并关闭');
  }, [closeProject, showNotice]);

  const handleSaveProject = useCallback(async () => {
    const ok = await saveNow('manual');
    if (ok) showNotice('项目已保存');
  }, [saveNow, showNotice]);

  const handleWindowClose = useCallback(async () => {
    if (isDocumentMode) {
      if (activeDocument?.dirty && !activeDocument.readOnly && activeDocument.risk.safeToOverwrite) {
        await saveDocument();
      }
      await closeDocument();
    } else if (isProjectOpen) {
      await handleSaveProject();
    }
    await close();
  }, [
    activeDocument,
    close,
    closeDocument,
    handleSaveProject,
    isDocumentMode,
    isProjectOpen,
    saveDocument,
  ]);

  const handleNewDocument = useCallback(async () => {
    if (isProjectOpen) await closeProject();
    if (isDocumentMode) await closeWorkspace();
    newDocument();
    setFocusMode(false);
  }, [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, newDocument]);

  const handleOpenDocx = useCallback(async () => {
    if (isProjectOpen) await closeProject();
    const ok = await openDocx();
    if (ok) {
      setLeftOpen(true);
      setFocusMode(false);
    }
  }, [closeProject, isProjectOpen, openDocx, setLeftOpen]);

  const handleOpenDocxPath = useCallback(
    async (path: string) => {
      if (isProjectOpen) await closeProject();
      // Keep the current document workspace visible while the next DOCX is
      // read and parsed. Closing it first renders the welcome/empty shell for
      // one frame, which reads as a full-page reload flash.
      const ok = await openDocx(path);
      if (ok) {
        setLeftOpen(true);
        setFocusMode(false);
      }
    },
    [closeProject, isProjectOpen, openDocx, setLeftOpen],
  );

  const handleOpenFolder = useCallback(async () => {
    if (isProjectOpen) await closeProject();
    const ok = await openFolder();
    if (ok) {
      setLeftOpen(true);
      setFocusMode(false);
    }
  }, [closeProject, isProjectOpen, openFolder, setLeftOpen]);

  const handleOpenFolderPath = useCallback(
    async (path: string) => {
      if (isProjectOpen) await closeProject();
      const ok = await openFolder(path);
      if (ok) {
        setLeftOpen(true);
        setFocusMode(false);
      }
    },
    [closeProject, isProjectOpen, openFolder, setLeftOpen],
  );

  const handleDroppedPaths = useCallback(
    async (paths: string[]) => {
      const target = paths.find((path) => /\.docx$/i.test(path)) ?? paths[0];
      if (!target) return;
      if (/\.docx$/i.test(target)) await handleOpenDocxPath(target);
      else await handleOpenFolderPath(target);
    },
    [handleOpenDocxPath, handleOpenFolderPath],
  );
  useWorkspaceDrop(handleDroppedPaths);

  const handleOpenRecentItem = useCallback(
    async (item: RecentItem) => {
      if (item.kind === 'project') {
        if (isDocumentMode) await closeWorkspace();
        const ok = await openRecent(item.path);
        if (ok) setFocusMode(false);
        return;
      }
      if (isProjectOpen) await closeProject();
      if (isDocumentMode) await closeWorkspace();
      const ok = await openPath(item.path);
      if (ok) {
        setLeftOpen(true);
        setFocusMode(false);
      }
    },
    [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openPath, openRecent, setLeftOpen],
  );

  const handleSaveDocumentNow = useCallback(async () => {
    const ok = await saveDocument();
    if (ok) showNotice('Word 文档已保存');
  }, [saveDocument, showNotice]);

  const handleSaveDocumentAsNow = useCallback(async () => {
    const ok = await saveDocumentAs();
    if (ok) showNotice('Word 文档已另存为');
  }, [saveDocumentAs, showNotice]);

  const handleRevealDocument = useCallback(async () => {
    const path = activeDocument?.path ?? documentRoot;
    if (!path) return;
    try {
      await revealWorkspacePath(path);
    } catch (revealError) {
      showNotice(revealError instanceof Error ? revealError.message : '无法打开资源管理器');
    }
  }, [activeDocument?.path, documentRoot, showNotice]);

  const handleCloseDocument = useCallback(async () => {
    await closeDocument();
    setFocusMode(false);
  }, [closeDocument]);

  const handleChooseDefaultDocumentsDir = useCallback(async () => {
    try {
      const selected = await chooseFolder('选择默认文稿目录');
      if (selected) {
        setDefaultDocumentsDir(selected);
        showNotice('默认文稿目录已更新');
      }
    } catch (dirError) {
      showNotice(dirError instanceof Error ? dirError.message : '无法选择默认文稿目录');
    }
  }, [setDefaultDocumentsDir, showNotice]);

  const openFontManager = useCallback(() => {
    setFontManagerOpen(true);
    void fonts.loadFontLists();
  }, [fonts.loadFontLists]);

  const handleOpenProjectPath = useCallback(
    async (path: string) => {
      if (isDocumentMode) await closeWorkspace();
      const ok = await openRecent(path);
      if (ok) setFocusMode(false);
    },
    [closeWorkspace, isDocumentMode, openRecent],
  );

  const handleNewProject = useCallback(async () => {
    if (isDocumentMode) await closeWorkspace();
    if (project) {
      const ok = await closeProject();
      if (!ok) return;
    }
    setFocusMode(false);
    setProjectCreateRequest((current) => current + 1);
  }, [closeProject, closeWorkspace, isDocumentMode, project]);

  const handleOpenProject = useCallback(async () => {
    if (isDocumentMode) await closeWorkspace();
    const ok = await openProject();
    if (ok) setFocusMode(false);
  }, [closeWorkspace, isDocumentMode, openProject]);

  const handleOpenRecent = useCallback(
    async (path: string) => {
      if (isDocumentMode) await closeWorkspace();
      const ok = await openRecent(path);
      if (ok) setFocusMode(false);
    },
    [closeWorkspace, isDocumentMode, openRecent],
  );

  const handleAddBackground = useCallback(
    async (file: File) => {
      if (!isProjectOpen && !isDocumentMode) {
        showNotice('请先打开一个项目或文稿文件夹');
        return;
      }
      try {
        await setBackgroundFromFile(file);
        showNotice('背景已更换');
      } catch (backgroundError) {
        showNotice(backgroundError instanceof Error ? backgroundError.message : '背景图片读取失败');
      }
    },
    [isDocumentMode, isProjectOpen, setBackgroundFromFile, showNotice],
  );

  const onBackgroundDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      dragDepth.current = 0;
      setDragActive(false);
      const file = Array.from(event.dataTransfer.files).find((item) =>
        item.type.startsWith('image/'),
      );
      if (!file) {
        if (event.dataTransfer.files.length > 0) {
          event.preventDefault();
          showNotice('请拖入 JPG、PNG 或 WebP 图片');
        }
        return;
      }
      event.preventDefault();
      await handleAddBackground(file);
    },
    [handleAddBackground, showNotice],
  );

  const handleDocxImport = useCallback(async () => {
    if (!isProjectOpen) {
      showNotice('请先打开一个项目');
      return;
    }
    setImportBusy(true);
    try {
      const path = await chooseDocxOpenPath();
      if (!path) {
        setImportBusy(false);
        return;
      }
      const bytes = await readDocxFile(path);
      const fileName = path.split(/[\\/]/).pop() || 'import.docx';
      const file = new File([new Uint8Array(bytes) as BlobPart], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const { importDocx } = await import('./docx/importDocx');
      const imported = await importDocx(file);
      setImportedDocx(imported);
    } catch (importError) {
      showNotice(importError instanceof Error ? importError.message : 'Word 文档导入失败');
    } finally {
      setImportBusy(false);
    }
  }, [isProjectOpen, showNotice]);

  const confirmDocxImport = useCallback(async () => {
    if (!importedDocx) return;
    setImportBusy(true);
    const ok = await addChapterWithContent(
      importedDocx.title,
      importedDocx.doc,
      importedDocx.characterCount,
      importedDocx.excerpt,
    );
    setImportBusy(false);
    if (ok) {
      setImportedDocx(null);
      showNotice('Word 文档已作为新章节导入');
    }
  }, [addChapterWithContent, importedDocx, showNotice]);

  const handleDocxExport = useCallback(
    async (options: DocxExportOptions, scope: 'current' | 'all') => {
      if (!isProjectOpen) return;
      setExportBusy(true);
      try {
        const exportChapters = await loadExportChapters(scope);
        if (exportChapters.length === 0) throw new Error('没有可导出的章节');
        const { buildDocxBlob } = await import('./docx/exportDocx');
        const { blob, skippedImages } = await buildDocxBlob(exportChapters, options);
        const baseName = (scope === 'current' ? activeChapter?.title : project?.name) || 'PaperScape 文档';
        const safeName = baseName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim() || 'PaperScape 文档';
        const chosen = await chooseDocxSavePath(
          '导出 Word 文档',
          `${safeName}${scope === 'all' ? '-全稿' : ''}.docx`,
        );
        if (!chosen) {
          setExportBusy(false);
          return;
        }
        const path = chosen.toLowerCase().endsWith('.docx') ? chosen : `${chosen}.docx`;
        await saveDocxExport(path, new Uint8Array(await blob.arrayBuffer()));
        setExportOpen(false);
        showNotice(
          skippedImages > 0
            ? `已导出 DOCX；${skippedImages} 张不受支持的图片未写入`
            : 'Word 文档已导出',
        );
      } catch (exportError) {
        showNotice(exportError instanceof Error ? exportError.message : 'Word 文档导出失败');
      } finally {
        setExportBusy(false);
      }
    },
    [activeChapter?.title, isProjectOpen, loadExportChapters, project?.name, showNotice],
  );

  const openHistory = useCallback(
    async (chapter: ChapterSummary) => {
      setHistoryTarget(chapter);
      setHistoryEntries([]);
      setHistoryLoading(true);
      try {
        setHistoryEntries(await history(chapter.id));
      } catch (historyError) {
        showNotice(historyError instanceof Error ? historyError.message : '历史版本读取失败');
        setHistoryTarget(null);
      } finally {
        setHistoryLoading(false);
      }
    },
    [history, showNotice],
  );

  const handleRestoreHistory = useCallback(
    async (file: string) => {
      if (!historyTarget) return;
      setBusy(true);
      const ok = await restoreHistory(historyTarget.id, file);
      setBusy(false);
      if (ok) {
        setHistoryTarget(null);
        showNotice('已恢复历史版本；恢复前内容也已备份');
      }
    },
    [historyTarget, restoreHistory, showNotice],
  );

  const handleDeleteChapter = useCallback(async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const ok = await deleteChapter(deleteTarget.id);
    setBusy(false);
    if (ok) {
      setDeleteTarget(null);
      showNotice('章节已移入项目回收目录');
    }
  }, [deleteChapter, deleteTarget, showNotice]);

  const handleRestoreRecovery = useCallback(
    async (candidate: RecoveryCandidate) => {
      setBusy(true);
      const ok = await restoreRecovery(candidate.chapterId);
      setBusy(false);
      if (ok) showNotice('已恢复异常关闭前的草稿');
    },
    [restoreRecovery, showNotice],
  );

  const handleDiscardRecovery = useCallback(async () => {
    if (!discardTarget) return;
    setBusy(true);
    const ok = await discardRecovery(discardTarget.chapterId);
    setBusy(false);
    if (ok) {
      setDiscardTarget(null);
      showNotice('恢复草稿已丢弃');
    }
  }, [discardRecovery, discardTarget, showNotice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event as KeyboardEvent & { isComposing?: boolean }).isComposing || event.keyCode === 229) {
        return;
      }
      if (event.key === 'F11') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (event.key === 'Escape' && focusMode && !dialog && !deleteTarget && !historyTarget) {
        setFocusMode(false);
        return;
      }
      if (event.key === 'F2' && isProjectOpen) {
        const target = event.target;
        const editingField =
          target instanceof HTMLElement &&
          Boolean(target.closest('input, textarea, select'));
        if (!editingField) {
          event.preventDefault();
          setRenameOpen(true);
          return;
        }
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const inEditor = Boolean((event.target as HTMLElement | null)?.closest?.('.tiptap'));

      if (key === 'n' && event.shiftKey) {
        event.preventDefault();
        void handleNewProject();
      } else if (key === 'n') {
        event.preventDefault();
        void handleNewDocument();
      } else if (event.altKey && ['1', '2', '3', '4'].includes(key)) {
        event.preventDefault();
        setUiZoom({ '1': 100, '2': 110, '3': 125, '4': 150 }[key] ?? 110);
      } else if (key === 'o' && event.shiftKey) {
        event.preventDefault();
        void handleOpenFolder();
      } else if (key === 'o') {
        event.preventDefault();
        void handleOpenDocx();
      } else if (key === '=' || key === '+') {
        if (!isProjectOpen && !isDocumentMode) return;
        event.preventDefault();
        setDocZoom(docZoom + 10);
      } else if (key === '-') {
        if (!isProjectOpen && !isDocumentMode) return;
        event.preventDefault();
        setDocZoom(docZoom - 10);
      } else if (key === '0') {
        if (!isProjectOpen && !isDocumentMode) return;
        event.preventDefault();
        resetDocZoom();
      } else if (key === 'w') {
        event.preventDefault();
        if (isDocumentMode) void handleCloseDocument();
        else if (isProjectOpen) void handleCloseProject();
      } else if (key === 's' && event.shiftKey) {
        event.preventDefault();
        if (isDocumentMode && activeDocument) void handleSaveDocumentAsNow();
      } else if (key === 's') {
        event.preventDefault();
        if (isDocumentMode) void handleSaveDocumentNow();
        else if (isProjectOpen) void handleSaveProject();
      } else if (key === 'f' && event.shiftKey) {
        event.preventDefault();
        if (isProjectOpen || isDocumentMode) toggleFocusFromShortcut();
      } else if (key === 'b' && !event.shiftKey) {
        if (inEditor) return;
        if (isTextEditingTarget(event.target)) return;
        event.preventDefault();
        if (isProjectOpen || isDocumentMode) toggleLeft();
      } else if (key === 'b' && event.shiftKey) {
        event.preventDefault();
        if (isProjectOpen) toggleRight();
      } else if (key === 'f') {
        event.preventDefault();
        if (isProjectOpen || isDocumentMode) editorRef.current?.openFind();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeDocument,
    deleteTarget,
    dialog,
    docZoom,
    focusMode,
    handleCloseDocument,
    handleCloseProject,
    handleNewDocument,
    handleNewProject,
    handleOpenDocx,
    handleOpenFolder,
    handleSaveDocumentAsNow,
    handleSaveDocumentNow,
    handleSaveProject,
    historyTarget,
    isDocumentMode,
    isProjectOpen,
    resetDocZoom,
    setDocZoom,
    setUiZoom,
    toggleFocusFromShortcut,
    toggleFullscreen,
    toggleLeft,
    toggleRight,
  ]);

  useEffect(() => {
    if (!focusMode) return;
    const timer = window.setTimeout(() => {
      const scroll = document.querySelector<HTMLElement>('.editor-scroll');
      if (scroll && typeof scroll.scrollTo === 'function') {
        scroll.scrollTo({ top: 0 });
      } else if (scroll) {
        scroll.scrollTop = 0;
      }
      editorRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusMode]);

  useEffect(() => {
    if (dialog || fontManagerOpen) editorRef.current?.blur();
  }, [dialog, fontManagerOpen]);

  const fullCharacterCount = chapters.reduce(
    (total, chapter) => total + chapter.characterCount,
    0,
  );

  const settingsPanel = (
    <SettingsPanel
      open={rightOpen && !focusMode}
      documentMode={isDocumentMode}
      theme={themeMode}
      settings={settings}
      appearance={appearance}
      savedThemes={savedThemes}
      environmentPresets={environmentPresets}
      focusMode={focusMode}
      onThemeChange={changeClassicTheme}
      onUiColorModeChange={changeUiColorMode}
      onDisplayChange={updateDisplay}
      onAnimationChange={updateAnimation}
      onApplyEnvironment={applyEnvironment}
      onSaveEnvironment={saveCurrentEnvironment}
      onRenameEnvironment={renameEnvironment}
      onDeleteEnvironment={deleteEnvironment}
      onDuplicateEnvironment={duplicateEnvironment}
      onExportEnvironment={exportEnvironment}
      onImportEnvironment={importEnvironment}
      onRestoreDefaultEnvironment={restoreDefaultEnvironment}
      onSettingsChange={updateSettings}
      onModeChange={changeWritingMode}
      onBackgroundChange={updateBackground}
      onReadingOpacityChange={setReadingOpacity}
      onPaperChange={updatePaper}
      onApplyPreset={applyPreset}
      onApplySavedTheme={applySavedTheme}
      onDeleteSavedTheme={deleteSavedTheme}
      onSaveTheme={saveCurrentTheme}
      onChooseImage={handleAddBackground}
      backgroundVideoUrl={backgroundVideoUrl}
      onChooseVideo={setBackgroundFromVideo}
      onToggleVideo={toggleBackgroundVideo}
      defaultDocumentsDir={defaultDocumentsDir}
      onChooseDefaultDocumentsDir={() => void handleChooseDefaultDocumentsDir()}
      uiZoom={uiZoom}
      onUiZoomChange={setUiZoom}
      openLastSession={openLastSession}
      onOpenLastSessionChange={setOpenLastSession}
      onManageFonts={openFontManager}
      proofreadingEnabled={proofreading.enabled}
      proofreadingDictionaryCount={proofreading.dictionary.length}
      proofreadingIgnoredCount={proofreading.ignored.length}
      onProofreadingEnabledChange={proofreading.setEnabled}
      onClearProofreadingDictionary={proofreading.clearDictionary}
      onClearProofreadingIgnored={proofreading.clearIgnored}
      onToggleFocus={toggleFocusMode}
      onClose={toggleRight}
      saveMode={saveMode}
      onSaveModeChange={changeSaveMode}
      documentBarAutoCollapse={documentBarAutoCollapse}
      onDocumentBarAutoCollapseChange={changeDocumentBarAutoCollapse}
    />
  );

  const titleBar = (
    <TitleBar
      projectName={activeDocument?.name ?? project?.name ?? (documentRoot ? baseName(documentRoot) : '')}
      projectPath={activeDocument?.path ?? projectPath ?? documentRoot ?? ''}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      isMaximized={isMaximized}
      focusMode={focusMode}
      leftPanelLabel={isDocumentMode ? 'files' : 'chapters'}
      onToggleLeft={toggleLeft}
      onToggleRight={toggleRight}
      onToggleFocus={toggleFocusMode}
      onMinimize={minimize}
      onToggleMaximize={toggleMaximize}
      onClose={() => void handleWindowClose()}
      menu={
        <MenuBar
          hasProject={isProjectOpen}
          hasDocument={Boolean(activeDocument || documentRoot)}
          projectName={project?.name ?? ''}
          documentName={activeDocument?.name ?? (documentRoot ? baseName(documentRoot) : '')}
          documentPath={activeDocument?.path ?? documentRoot ?? ''}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          theme={themeMode}
          writingMode={appearance.mode}
          focusMode={focusMode}
          onNewDocument={() => void handleNewDocument()}
          onOpenDocx={() => void handleOpenDocx()}
          onOpenFolder={() => void handleOpenFolder()}
          onSaveDocument={() => void handleSaveDocumentNow()}
          onSaveDocumentAs={() => void handleSaveDocumentAsNow()}
          onRevealDocument={() => void handleRevealDocument()}
          onCloseDocument={() => void handleCloseDocument()}
          onNewProject={() => void handleNewProject()}
          onOpenProject={() => void handleOpenProject()}
          onCloseProject={() => void handleCloseProject()}
          onImportDocx={() => void handleDocxImport()}
          onExportDocx={() => setExportOpen(true)}
          onNewChapter={() => void handleCreateChapter()}
          onShowHistory={() => {
            const activeSummary = chapters.find((chapter) => chapter.id === activeChapter?.id);
            if (activeSummary) void openHistory(activeSummary);
          }}
          onRenameChapter={() => setRenameOpen(true)}
          onMoveChapter={(direction) => {
            if (activeChapter) void moveChapter(activeChapter.id, direction);
          }}
          onDeleteChapter={() => {
            const activeSummary = chapters.find((chapter) => chapter.id === activeChapter?.id);
            if (activeSummary) setDeleteTarget(activeSummary);
          }}
          onSave={() => void handleSaveProject()}
          onExit={() => void handleWindowClose()}
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          onSelectAll={() => editorRef.current?.selectAll()}
          onFind={() => editorRef.current?.openFind()}
          onToggleLeft={toggleLeft}
          onToggleRight={toggleRight}
          onToggleFocus={toggleFocusMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => void toggleFullscreen()}
          onWritingModeChange={changeWritingMode}
          onThemeChange={changeClassicTheme}
          uiZoom={uiZoom}
          onUiZoomChange={setUiZoom}
          openLastSession={openLastSession}
          onOpenLastSessionChange={setOpenLastSession}
          onChooseDefaultDocumentsDir={() => void handleChooseDefaultDocumentsDir()}
          onManageFonts={openFontManager}
          proofreadingEnabled={proofreading.enabled}
          onToggleProofreading={() => proofreading.setEnabled(!proofreading.enabled)}
          onShowShortcuts={() => setDialog('shortcuts')}
          onShowAbout={() => setDialog('about')}
        />
      }
    />
  );

  return (
    <div
      className={`app-shell mode-${effectiveAppearance.mode}${focusMode ? ' is-focus-mode' : ''}${
        isMaximized ? ' is-maximized' : ''
      }`}
    >
      <ResizeHandles hidden={isMaximized} />
      {titleBar}

      <div
        className={`workspace-stage${dragActive ? ' is-drag-over' : ''}`}
        onDragEnter={(event) => {
          if ((!isProjectOpen && !isDocumentMode) || !hasImageFile(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          if ((!isProjectOpen && !isDocumentMode) || !hasImageFile(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragActive(false);
        }}
        onDrop={(event) => void onBackgroundDrop(event)}
      >
        <BackgroundLayer
          background={effectiveBackground}
          animation={effectiveAppearance.animation}
          imageUrl={backgroundUrl}
          videoUrl={backgroundVideoUrl}
          focusMode={focusMode}
        />

        {isDocumentMode ? (
          <div className="workspace document-workspace">
            {documentRoot ? (
              <FileTree
                root={documentRoot}
                tree={documentTree}
                activePath={activeDocument?.path ?? null}
                open={leftOpen && !focusMode}
                loading={documentLoading}
                onOpenFile={(node: WorkspaceNode) => void handleOpenDocxPath(node.path)}
                onOpenProject={(path) => void handleOpenProjectPath(path)}
                onRefresh={() => void refreshTree()}
                onReveal={() => void handleRevealDocument()}
                onClose={toggleLeft}
              />
            ) : null}

            {activeDocument && editorChapter ? (
              <EditorPane
                key={activeDocument.path ?? 'untitled-docx'}
                ref={editorRef}
                chapter={editorChapter}
                index={0}
                total={1}
                settings={settings}
                appearance={effectiveAppearance}
                focusMode={focusMode}
                readOnly={activeDocument.readOnly}
                standalone
                docZoom={docZoom}
                onDocZoomChange={setDocZoom}
                proofreadingEnabled={proofreading.enabled}
                proofreadingDictionary={proofreading.dictionary}
                proofreadingIgnored={proofreading.ignored}
                onAddProofreadingWord={proofreading.addDictionary}
                onIgnoreProofreading={proofreading.ignore}
                header={
                  <div className="document-bar-shell">
                    <div className="document-bar-toggle-row">
                      <button
                        type="button"
                        className="document-bar-toggle"
                        aria-label={documentBarCollapsed ? '展开文稿信息栏' : '收起文稿信息栏'}
                        aria-expanded={!documentBarCollapsed}
                        title={documentBarCollapsed ? '展开文稿信息栏' : '收起文稿信息栏'}
                        onClick={toggleDocumentBar}
                      >
                        <Icon name={documentBarCollapsed ? 'chevron-down' : 'chevron-up'} size={11} />
                      </button>
                    </div>
                    {!documentBarCollapsed ? (
                      <DocumentBar
                        document={activeDocument}
                        folder={documentRoot}
                        saving={documentSaving}
                        error={documentError}
                        recovery={documentRecovery}
                        recoveryError={documentRecoveryError}
                        autoSave={saveMode === 'auto'}
                        onSave={() => void handleSaveDocumentNow()}
                        onSaveAs={() => void handleSaveDocumentAsNow()}
                        onReveal={() => void handleRevealDocument()}
                        onAuthorizeOverwrite={authorizeOverwrite}
                        onToggleReadOnly={toggleReadOnly}
                        onRestoreRecovery={restoreDocumentRecovery}
                        onDiscardRecovery={discardDocumentRecovery}
                        onClearError={clearDocumentError}
                        onCloseWorkspace={() => void closeWorkspace()}
                      />
                    ) : null}
                  </div>
                }
                onUpdate={updateDocument}
              />
            ) : (
              <main className="editor-pane document-empty" aria-label="未选择文稿">
                <div className="document-empty-card">
                  <Icon name="file" size={26} />
                  <h2>{documentRoot ? '选择一个 DOCX 文稿' : '新建或打开文稿'}</h2>
                  <p>
                    {documentRoot
                      ? '从左侧真实文件夹树选择 Word 文档。也可以拖入 DOCX 或文件夹。'
                      : '无需先创建 PaperScape 项目，直接编辑磁盘上的 Word 文档。'}
                  </p>
                  <div className="document-empty-actions">
                    <button type="button" className="primary-button" onClick={() => void handleOpenDocx()}>
                      打开 Word 文档
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void handleOpenFolder()}>
                      打开文件夹
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void handleNewDocument()}>
                      新建文档
                    </button>
                  </div>
                </div>
              </main>
            )}
            {settingsPanel}
          </div>
        ) : isProjectOpen && activeChapter ? (
          <div className="workspace">
            <ChapterSidebar
              chapters={chapters}
              activeId={activeChapter.id}
              open={leftOpen && !focusMode}
              onSelect={handleSelectChapter}
              onAdd={() => void handleCreateChapter()}
              onRename={(id, title) => void renameChapter(id, title)}
              onMove={(id, direction) => void moveChapter(id, direction)}
              onDelete={setDeleteTarget}
              onHistory={(chapter) => void openHistory(chapter)}
              onClose={toggleLeft}
            />

            <EditorPane
              key={`${activeChapter.id}:${documentRevision}`}
              ref={editorRef}
              chapter={activeChapter}
              index={activeIndex}
              total={chapters.length}
              settings={settings}
              appearance={effectiveAppearance}
              focusMode={focusMode}
              docZoom={docZoom}
              onDocZoomChange={setDocZoom}
              proofreadingEnabled={proofreading.enabled}
              proofreadingDictionary={proofreading.dictionary}
              proofreadingIgnored={proofreading.ignored}
              onAddProofreadingWord={proofreading.addDictionary}
              onIgnoreProofreading={proofreading.ignore}
              onUpdate={updateActiveChapter}
            />

            {settingsPanel}
          </div>
        ) : (
          <ProjectLauncher
            recent={recent}
            recentItems={recentItems}
            loading={loading}
            error={error || documentError}
            createRequested={projectCreateRequest}
            onCreate={(parent, name) => {
              void createProject(parent, name).then((ok) => {
                if (ok) setProjectCreateRequest(0);
              });
            }}
            onOpen={() => void handleOpenProject()}
            onOpenRecent={(path) => void handleOpenRecent(path)}
            onOpenPath={(path) => void handleOpenRecent(path)}
            onNewDocument={() => void handleNewDocument()}
            onOpenDocx={() => void handleOpenDocx()}
            onOpenFolder={() => void handleOpenFolder()}
            onOpenRecentItem={(item) => void handleOpenRecentItem(item)}
            defaultDocumentsDir={defaultDocumentsDir}
            onChooseDefaultDocumentsDir={() => void handleChooseDefaultDocumentsDir()}
            onImportLegacy={() => void importLegacy()}
            onClearError={() => {
              clearError();
              clearDocumentError();
            }}
          />
        )}

        {recovery.length > 0 ? (
          <div className="recovery-banner" role="alert">
            <Icon name="history" size={17} />
            <div className="recovery-copy">
              <strong>检测到上次异常退出</strong>
              <span>
                《{recovery[0].title}》有较新的恢复草稿（{recovery[0].characterCount} 字）。
                恢复会先备份当前版本。
              </span>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                setDiscardTarget(recovery[0]);
              }}
            >
              丢弃草稿
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={() => void handleRestoreRecovery(recovery[0])}
            >
              恢复草稿
            </button>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="warning-stack" aria-live="polite">
            {warnings.map((warning, index) => (
              <div className="project-warning" key={`${warning}-${index}`}>
                <span>{warning}</span>
                <button
                  type="button"
                  aria-label="关闭提示"
                  onClick={() => dismissWarning(index)}
                >
                  <Icon name="close" size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {dragActive ? (
          <div className="drop-overlay" aria-hidden="true">
            <div className="drop-overlay-card">
              <Icon name="image" size={28} />
              <strong>松开以更换背景</strong>
              <span>JPG / PNG / WebP</span>
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="app-toast" role="status">
            {notice}
          </div>
        ) : null}
        {error && isProjectOpen ? (
          <div className="app-toast is-error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="关闭错误提示" onClick={clearError}>
              <Icon name="close" size={11} />
            </button>
          </div>
        ) : null}
      </div>

      {focusMode ? (
        <FocusOverlay
          paperOpacity={focusPaperOpacity}
          brightness={focusBrightness}
          blur={focusBlur}
          overlay={focusOverlay}
          onPaperOpacityChange={setFocusPaperOpacity}
          onBrightnessChange={setFocusBrightness}
          onBlurChange={setFocusBlur}
          onOverlayChange={setFocusOverlay}
          onExit={() => setFocusMode(false)}
        />
      ) : null}

      {isProjectOpen ? (
        <StatusBar
          chapterIndex={activeIndex}
          chapterCount={chapters.length}
          characterCount={activeChapter?.characterCount ?? 0}
          fullCharacterCount={fullCharacterCount}
          savedAt={savedAt}
          saving={saving}
          dirty={dirty}
          focusMode={focusMode}
          onToggleFocus={toggleFocusMode}
          zoom={docZoom}
          onZoomChange={setDocZoom}
          saveError={error && /保存|写入/.test(error) ? error : ''}
        />
      ) : null}

      {isDocumentMode && activeDocument ? (
        <StatusBar
          chapterIndex={0}
          chapterCount={1}
          characterCount={activeDocument.characterCount}
          fullCharacterCount={activeDocument.characterCount}
          savedAt={activeDocument.savedAt}
          saving={documentSaving}
          dirty={activeDocument.dirty}
          focusMode={false}
          onToggleFocus={() => undefined}
          standalone
          documentName={activeDocument.name}
          zoom={docZoom}
          onZoomChange={setDocZoom}
          saveError={documentError && /保存|写入/.test(documentError) ? documentError : ''}
        />
      ) : null}

      {historyTarget ? (
        <HistoryDialog
          chapterTitle={historyTarget.title}
          entries={historyEntries}
          loading={historyLoading}
          onRestore={(file) => void handleRestoreHistory(file)}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="删除章节"
          message={`确定删除《${deleteTarget.title}》吗？章节文件会移入项目的 trash 回收目录，不会立即永久删除；历史版本仍会保留。`}
          confirmLabel="移入回收目录"
          danger
          busy={busy}
          onConfirm={() => void handleDeleteChapter()}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {discardTarget ? (
        <ConfirmDialog
          title="丢弃恢复草稿"
          message="这会删除异常退出时留下的恢复草稿。当前已保存的章节内容不会被删除，历史版本也不受影响。"
          confirmLabel="丢弃草稿"
          danger
          busy={busy}
          onConfirm={() => void handleDiscardRecovery()}
          onClose={() => setDiscardTarget(null)}
        />
      ) : null}

      {renameOpen && activeChapter ? (
        <RenameChapterDialog
          title={activeChapter.title}
          onSave={(title) => void renameChapter(activeChapter.id, title)}
          onClose={() => setRenameOpen(false)}
        />
      ) : null}

      {importedDocx ? (
        <ImportDocxDialog
          imported={importedDocx}
          busy={importBusy}
          onImport={() => void confirmDocxImport()}
          onClose={() => {
            if (!importBusy) setImportedDocx(null);
          }}
        />
      ) : null}

      {exportOpen ? (
        <DocxExportDialog
          chapterTitle={activeChapter?.title ?? '当前章节'}
          chapterCount={chapters.length}
          busy={exportBusy}
          onExport={(options, scope) => void handleDocxExport(options, scope)}
          onClose={() => {
            if (!exportBusy) setExportOpen(false);
          }}
        />
      ) : null}

      {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'about' ? <AboutDialog onClose={() => setDialog(null)} /> : null}
      {fontManagerOpen ? (
        <FontManagerDialog
          config={fonts.config}
          fonts={fonts.fonts}
          importedFonts={fonts.importedFonts}
          loading={fonts.loading}
          error={fonts.error}
          onSelect={fonts.setFont}
          onReset={fonts.resetFont}
          onImport={fonts.importUserFont}
          onRemove={fonts.removeFont}
          onPreview={fonts.previewFamily}
          onRefresh={() => void fonts.loadFontLists()}
          onClose={() => setFontManagerOpen(false)}
        />
      ) : null}
    </div>
  );
}
