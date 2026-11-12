import { useCallback, useEffect, useRef, useState } from 'react';
import { ChapterSidebar } from './components/ChapterSidebar';
import { AboutDialog, ShortcutsDialog } from './components/Dialogs';
import { EditorPane, type EditorPaneHandle } from './components/EditorPane';
import { MenuBar } from './components/MenuBar';
import { ResizeHandles } from './components/ResizeHandles';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { usePanels } from './hooks/usePanels';
import { useTheme } from './hooks/useTheme';
import { useWindowState } from './hooks/useWindowState';
import { useWorkspace } from './hooks/useWorkspace';

type DialogName = 'shortcuts' | 'about' | null;

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export default function App() {
  const {
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
  const { mode, setMode } = useTheme();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = usePanels();
  const { isMaximized, minimize, toggleMaximize, close } = useWindowState();
  const [dialog, setDialog] = useState<DialogName>(null);
  const editorRef = useRef<EditorPaneHandle>(null);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const inEditor = Boolean((event.target as HTMLElement | null)?.closest?.('.tiptap'));

      if (key === 'b' && !event.shiftKey) {
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
  }, [createChapter, openFind, saveNow, toggleLeft, toggleRight]);

  useEffect(() => {
    if (dialog) editorRef.current?.blur();
  }, [dialog]);

  const fullCharacterCount = chapters.reduce((total, chapter) => total + chapter.characterCount, 0);

  return (
    <div className={`app-shell${isMaximized ? ' is-maximized' : ''}`}>
      <ResizeHandles hidden={isMaximized} />

      <TitleBar
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        isMaximized={isMaximized}
        onToggleLeft={toggleLeft}
        onToggleRight={toggleRight}
        onMinimize={minimize}
        onToggleMaximize={toggleMaximize}
        onClose={() => void close()}
        menu={
          <MenuBar
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            theme={mode}
            onNewChapter={createChapter}
            onSave={saveNow}
            onExit={() => void close()}
            onUndo={undo}
            onRedo={redo}
            onSelectAll={selectAll}
            onFind={openFind}
            onToggleLeft={toggleLeft}
            onToggleRight={toggleRight}
            onThemeChange={setMode}
            onShowShortcuts={() => setDialog('shortcuts')}
            onShowAbout={() => setDialog('about')}
          />
        }
      />

      <div className="workspace">
        <ChapterSidebar
          chapters={chapters}
          activeId={activeChapter.id}
          open={leftOpen}
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
          onUpdate={updateActiveChapter}
        />

        <SettingsPanel
          open={rightOpen}
          theme={mode}
          settings={settings}
          onThemeChange={setMode}
          onSettingsChange={updateSettings}
          onClose={toggleRight}
        />
      </div>

      <StatusBar
        chapterIndex={activeIndex}
        chapterCount={chapters.length}
        characterCount={activeChapter.characterCount}
        fullCharacterCount={fullCharacterCount}
        savedAt={savedAt}
      />

      {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'about' ? <AboutDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
