import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { ChapterSidebar } from './components/ChapterSidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DocxExportDialog } from './components/DocxExportDialog';
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
import { chooseDocxOpenPath, chooseDocxSavePath, readDocxFile, saveDocxExport } from './project/api';
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

  const appearance = project?.appearance ?? DEFAULT_APPEARANCE;
  const settings = project?.settings ?? DEFAULT_SETTINGS;
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

  const handleNewProject = useCallback(async () => {
    if (project) {
      const ok = await closeProject();
      if (!ok) return;
    }
    setFocusMode(false);
  }, [closeProject, project]);

  const handleOpenProject = useCallback(async () => {
    const ok = await openProject();
    if (ok) setFocusMode(false);
  }, [openProject]);

  const handleOpenRecent = useCallback(
    async (path: string) => {
      const ok = await openRecent(path);
      if (ok) setFocusMode(false);
    },
    [openRecent],
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
        if (isProjectOpen) void handleCreateChapter();
      } else if (key === 'o') {
        event.preventDefault();
        void handleOpenProject();
      } else if (key === 'w') {
        event.preventDefault();
        if (isProjectOpen) void handleCloseProject();
      } else if (key === 's') {
        event.preventDefault();
        if (isProjectOpen) void handleSaveProject();
      } else if (key === 'f' && event.shiftKey) {
        event.preventDefault();
        if (isProjectOpen) toggleFocusMode();
      } else if (key === 'b' && !event.shiftKey) {
        if (inEditor) return;
        if (isTextEditingTarget(event.target)) return;
        event.preventDefault();
        if (isProjectOpen) toggleLeft();
      } else if (key === 'b' && event.shiftKey) {
        event.preventDefault();
        if (isProjectOpen) toggleRight();
      } else if (key === 'f') {
        event.preventDefault();
        if (isProjectOpen) editorRef.current?.openFind();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    deleteTarget,
    dialog,
    focusMode,
    handleCloseProject,
    handleCreateChapter,
    handleNewProject,
    handleOpenProject,
    handleSaveProject,
    historyTarget,
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
      projectName={project?.name ?? ''}
      leftOpen={leftOpen}
      rightOpen={rightOpen}
      isMaximized={isMaximized}
      focusMode={focusMode}
      onToggleLeft={toggleLeft}
      onToggleRight={toggleRight}
      onToggleFocus={toggleFocusMode}
      onMinimize={minimize}
      onToggleMaximize={toggleMaximize}
      onClose={() => void close()}
      menu={
        <MenuBar
          hasProject={isProjectOpen}
          projectName={project?.name ?? ''}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          theme={themeMode}
          writingMode={appearance.mode}
          focusMode={focusMode}
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
          onExit={() => void close()}
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

        {isProjectOpen && activeChapter ? (
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
              onToggleFocus={toggleFocusMode}
              onClose={toggleRight}
            />
          </div>
        ) : (
          <ProjectLauncher
            recent={recent}
            loading={loading}
            error={error}
            onCreate={(parent, name) => void createProject(parent, name)}
            onOpen={() => void handleOpenProject()}
            onOpenRecent={(path) => void handleOpenRecent(path)}
            onOpenPath={(path) => void handleOpenRecent(path)}
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
