import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { ChapterSidebar } from './components/ChapterSidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DocumentBar } from './components/DocumentBar';
import { DocxExportDialog } from './components/DocxExportDialog';
import { FileTree } from './components/FileTree';
import { ImportDocxDialog } from './components/ImportDocxDialog';
import { AboutDialog, ShortcutsDialog } from './components/Dialogs';
import { EditorPane, type EditorPaneHandle } from './components/EditorPane';
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
import { DEFAULT_SETTINGS } from './types';
import type { DocxExportOptions } from './docx/exportDocx';
import type { ImportedDocx } from './docx/importDocx';
import { chooseDocxOpenPath, chooseDocxSavePath, chooseFolder, readDocxFile, saveDocxExport } from './project/api';
import { revealWorkspacePath } from './workspace/api';
import { baseName, useDocumentWorkspace } from './workspace/useDocumentWorkspace';
import { useWorkspaceDrop } from './workspace/useWorkspaceDrop';
import type { RecentItem, WorkspaceNode } from './workspace/types';
import { usePanels } from './hooks/usePanels';
import { useTheme } from './hooks/useTheme';
import { useWindowState } from './hooks/useWindowState';
import { useProject } from './project/useProject';
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
  const projectController = useProject();
  const documentController = useDocumentWorkspace();
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
    history,
    restoreHistory,
    restoreRecovery,
    discardRecovery,
    dismissWarning,
    clearError,
  } = projectController;
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = usePanels();
  const { isMaximized, minimize, toggleMaximize, close } = useWindowState();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState('');
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

  const appearance = isDocumentMode ? DEFAULT_APPEARANCE : project?.appearance ?? DEFAULT_APPEARANCE;
  const settings = isDocumentMode ? DEFAULT_SETTINGS : project?.settings ?? DEFAULT_SETTINGS;
  const appearanceController = useProjectAppearance(appearance, projectController.updateAppearance);
  const {
    backgroundUrl,
    savedThemes,
    setMode: setWritingMode,
    updateBackground,
    setReadingOpacity,
    updatePaper,
    applyPreset,
    applySavedTheme,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
  } = appearanceController;

  const isProjectOpen = Boolean(project && activeChapter);

  const showNotice = useCallback((message: string) => setNotice(message), []);

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
    setFocusMode((current) => !current);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, []);

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
    if (isDocumentMode) await closeWorkspace();
    const ok = await openDocx();
    if (ok) setFocusMode(false);
  }, [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openDocx]);

  const handleOpenDocxPath = useCallback(
    async (path: string) => {
      if (isProjectOpen) await closeProject();
      if (isDocumentMode) await closeWorkspace();
      const ok = await openDocx(path);
      if (ok) setFocusMode(false);
    },
    [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openDocx],
  );

  const handleOpenFolder = useCallback(async () => {
    if (isProjectOpen) await closeProject();
    if (isDocumentMode) await closeWorkspace();
    const ok = await openFolder();
    if (ok) setFocusMode(false);
  }, [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openFolder]);

  const handleOpenFolderPath = useCallback(
    async (path: string) => {
      if (isProjectOpen) await closeProject();
      if (isDocumentMode) await closeWorkspace();
      const ok = await openFolder(path);
      if (ok) setFocusMode(false);
    },
    [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openFolder],
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
      if (ok) setFocusMode(false);
    },
    [closeProject, closeWorkspace, isDocumentMode, isProjectOpen, openPath, openRecent],
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
      if (!isProjectOpen) {
        showNotice('请先打开一个项目');
        return;
      }
      try {
        await setBackgroundFromFile(file);
        showNotice('背景已更换');
      } catch (backgroundError) {
        showNotice(backgroundError instanceof Error ? backgroundError.message : '背景图片读取失败');
      }
    },
    [isProjectOpen, setBackgroundFromFile, showNotice],
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
      } else if (key === 'o' && event.shiftKey) {
        event.preventDefault();
        void handleOpenFolder();
      } else if (key === 'o') {
        event.preventDefault();
        void handleOpenDocx();
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
        if (isProjectOpen) toggleFocusMode();
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
    toggleFocusMode,
    toggleLeft,
    toggleRight,
  ]);

  useEffect(() => {
    if (dialog) editorRef.current?.blur();
  }, [dialog]);

  const fullCharacterCount = chapters.reduce(
    (total, chapter) => total + chapter.characterCount,
    0,
  );

  const titleBar = (
    <TitleBar
      projectName={activeDocument?.name ?? project?.name ?? (documentRoot ? baseName(documentRoot) : '')}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      isMaximized={isMaximized}
      focusMode={focusMode}
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
          onWritingModeChange={changeWritingMode}
          onThemeChange={setThemeMode}
          onShowShortcuts={() => setDialog('shortcuts')}
          onShowAbout={() => setDialog('about')}
        />
      }
    />
  );

  return (
    <div
      className={`app-shell mode-${appearance.mode}${focusMode ? ' is-focus-mode' : ''}${
        isMaximized ? ' is-maximized' : ''
      }`}
    >
      <ResizeHandles hidden={isMaximized} />
      {titleBar}

      <div
        className={`workspace-stage${dragActive ? ' is-drag-over' : ''}`}
        onDragEnter={(event) => {
          if (!isProjectOpen || !hasImageFile(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          if (!isProjectOpen || !hasImageFile(event)) return;
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
          background={appearance.background}
          imageUrl={backgroundUrl}
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
                appearance={appearance}
                focusMode={focusMode}
                readOnly={activeDocument.readOnly}
                standalone
                header={
                  <DocumentBar
                    document={activeDocument}
                    folder={documentRoot}
                    saving={documentSaving}
                    error={documentError}
                    recovery={documentRecovery}
                    recoveryError={documentRecoveryError}
                    onSave={() => void handleSaveDocumentNow()}
                    onSaveAs={() => void handleSaveDocumentAsNow()}
                    onReveal={() => void handleRevealDocument()}
                    onAuthorizeOverwrite={authorizeOverwrite}
                    onToggleReadOnly={toggleReadOnly}
                    onRestoreRecovery={restoreDocumentRecovery}
                    onDiscardRecovery={discardDocumentRecovery}
                    onClearError={clearDocumentError}
                    onCloseDocument={() => void handleCloseDocument()}
                    onCloseWorkspace={() => void closeWorkspace()}
                  />
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
          </div>
        ) : isProjectOpen && activeChapter ? (
          <div className="workspace">
            <ChapterSidebar
              projectName={project?.name ?? ''}
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
              appearance={appearance}
              focusMode={focusMode}
              onUpdate={updateActiveChapter}
            />

            <SettingsPanel
              open={rightOpen && !focusMode}
              theme={themeMode}
              settings={settings}
              appearance={appearance}
              savedThemes={savedThemes}
              focusMode={focusMode}
              onThemeChange={setThemeMode}
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
              defaultDocumentsDir={defaultDocumentsDir}
              onChooseDefaultDocumentsDir={() => void handleChooseDefaultDocumentsDir()}
              onToggleFocus={toggleFocusMode}
              onClose={toggleRight}
            />
          </div>
        ) : (
          <ProjectLauncher
            recent={recent}
            recentItems={recentItems}
            loading={loading}
            error={error}
            onCreate={(parent, name) => void createProject(parent, name)}
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
            onClearError={clearError}
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
    </div>
  );
}
