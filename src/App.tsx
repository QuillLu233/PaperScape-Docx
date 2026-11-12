import { useCallback, useEffect, useRef, useState } from 'react';
import { ChapterSidebar } from './components/ChapterSidebar';
import { AboutDialog, ShortcutsDialog } from './components/Dialogs';
import { EditorPane } from './components/EditorPane';
import { MenuBar } from './components/MenuBar';
import { ResizeHandles } from './components/ResizeHandles';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { usePanels } from './hooks/usePanels';
import { useTheme } from './hooks/useTheme';
import { useWindowState } from './hooks/useWindowState';
import { useWorkspace } from './hooks/useWorkspace';
import { countCharacters } from './lib/text';

type DialogName = 'shortcuts' | 'about' | null;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createChapter = useCallback(() => {
    addChapter();
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, [addChapter]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();

      if (key === 'b') {
        event.preventDefault();
        if (event.shiftKey) toggleRight();
        else toggleLeft();
      } else if (key === 'n') {
        event.preventDefault();
        createChapter();
      } else if (key === 's') {
        event.preventDefault();
        saveNow();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createChapter, saveNow, toggleLeft, toggleRight]);

  useEffect(() => {
    if (dialog) textareaRef.current?.blur();
  }, [dialog]);

  const focusEditor = () => {
    textareaRef.current?.focus();
  };

  const undo = () => {
    focusEditor();
    document.execCommand('undo');
  };

  const redo = () => {
    focusEditor();
    document.execCommand('redo');
  };

  const selectAll = () => {
    focusEditor();
    textareaRef.current?.select();
  };

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
          chapter={activeChapter}
          index={activeIndex}
          total={chapters.length}
          settings={settings}
          textareaRef={textareaRef}
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
        characterCount={countCharacters(activeChapter.content)}
        savedAt={savedAt}
      />

      {dialog === 'shortcuts' ? <ShortcutsDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'about' ? <AboutDialog onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
