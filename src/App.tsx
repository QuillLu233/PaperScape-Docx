import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { BackgroundLayer } from './components/BackgroundLayer';
import { ChapterSidebar } from './components/ChapterSidebar';
import { AboutDialog, ShortcutsDialog } from './components/Dialogs';
import { EditorPane, type EditorPaneHandle } from './components/EditorPane';
import { Icon } from './components/Icon';
import { MenuBar } from './components/MenuBar';
import { ResizeHandles } from './components/ResizeHandles';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { useAppearance } from './appearance/useAppearance';
import { usePanels } from './hooks/usePanels';
import { useTheme } from './hooks/useTheme';
import { useWindowState } from './hooks/useWindowState';
import { useWorkspace } from './hooks/useWorkspace';

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
  const {
    projectId,
    chapters,
    activeChapter,
    activeIndex,
    settings,
    savedAt,
    selectChapter,
    addChapter,
    updateActiveChapter,
    updateSettings,
    saveNow,
  } = useWorkspace();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = usePanels();
  const { isMaximized, minimize, toggleMaximize, close } = useWindowState();
  const {
    appearance,
    backgroundUrl,
    savedThemes,
    setMode: setWritingMode,
    updateBackground,
    updatePaper,
    setReadingOpacity,
    applyPreset,
    applySavedTheme,
    saveCurrentTheme,
    deleteSavedTheme,
    setBackgroundFromFile,
  } = useAppearance(projectId);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState('');
  const dragDepth = useRef(0);
  const editorRef = useRef<EditorPaneHandle>(null);

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

  const createChapter = useCallback(() => {
    addChapter();
    window.setTimeout(() => editorRef.current?.focus(), 60);
  }, [addChapter]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const undo = useCallback(() => editorRef.current?.undo(), []);
  const redo = useCallback(() => editorRef.current?.redo(), []);
  const selectAll = useCallback(() => editorRef.current?.selectAll(), []);
  const openFind = useCallback(() => editorRef.current?.openFind(), []);

  useEffect(() => {
    const timer = window.setTimeout(focusEditor, 80);
    return () => window.clearTimeout(timer);
  }, [focusEditor]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusMode && !dialog) {
        setFocusMode(false);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const inEditor = Boolean((event.target as HTMLElement | null)?.closest?.('.tiptap'));

      if (key === 'f' && event.shiftKey) {
        event.preventDefault();
        toggleFocusMode();
      } else if (key === 'b' && !event.shiftKey) {
        // Inside Tiptap, Ctrl+B is bold. Outside editable fields it keeps the
        // phase-one panel shortcut.
        if (inEditor) return;
        if (isTextEditingTarget(event.target)) return;
        event.preventDefault();
        toggleLeft();
      } else if (key === 'b' && event.shiftKey) {
        event.preventDefault();
        toggleRight();
      } else if (key === 'n') {
        event.preventDefault();
        createChapter();
      } else if (key === 's') {
        event.preventDefault();
        saveNow();
      } else if (key === 'f') {
        event.preventDefault();
        openFind();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createChapter, dialog, focusMode, openFind, saveNow, toggleFocusMode, toggleLeft, toggleRight]);

  useEffect(() => {
    if (dialog) editorRef.current?.blur();
  }, [dialog]);

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
          setNotice('请拖入 JPG、PNG 或 WebP 图片');
        }
        return;
      }
      event.preventDefault();
      try {
        await setBackgroundFromFile(file);
        setNotice('背景已更换');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '背景图片读取失败');
      }
    },
    [setBackgroundFromFile],
  );

  const fullCharacterCount = chapters.reduce((total, chapter) => total + chapter.characterCount, 0);

  return (
    <div
      className={`app-shell mode-${appearance.mode}${focusMode ? ' is-focus-mode' : ''}${
        isMaximized ? ' is-maximized' : ''
      }`}
    >
      <ResizeHandles hidden={isMaximized} />

      <TitleBar
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
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            theme={themeMode}
            writingMode={appearance.mode}
            focusMode={focusMode}
            onNewChapter={createChapter}
            onSave={saveNow}
            onExit={() => void close()}
            onUndo={undo}
            onRedo={redo}
            onSelectAll={selectAll}
            onFind={openFind}
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

      <div
        className={`workspace-stage${dragActive ? ' is-drag-over' : ''}`}
        onDragEnter={(event) => {
          if (!hasImageFile(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          if (!hasImageFile(event)) return;
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

        <div className="workspace">
          <ChapterSidebar
            chapters={chapters}
            activeId={activeChapter.id}
            open={leftOpen && !focusMode}
            onSelect={selectChapter}
            onAdd={createChapter}
            onClose={toggleLeft}
          />

          <EditorPane
            key={activeChapter.id}
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
            onChooseImage={setBackgroundFromFile}
            onToggleFocus={toggleFocusMode}
            onClose={toggleRight}
          />
        </div>

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
      </div>

      <StatusBar
        chapterIndex={activeIndex}
        chapterCount={chapters.length}
        characterCount={activeChapter.characterCount}
        fullCharacterCount={fullCharacterCount}
        savedAt={savedAt}
        focusMode={focusMode}
        onToggleFocus={toggleFocusMode}
      />

      {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'about' ? <AboutDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
