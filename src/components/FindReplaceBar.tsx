import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  clearSearchState,
  getSearchState,
  replaceAllSearchMatches,
  replaceCurrentSearchMatch,
  selectSearchMatch,
  setSearchState,
  type SearchMatch,
} from '../editor/extensions/SearchHighlight';
import { Icon } from './Icon';

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

export function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [active, setActive] = useState(0);

  const syncFromPlugin = () => {
    const state = getSearchState(editor);
    if (!state) return;
    setMatches(state.matches);
    setActive(state.active);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onTransaction = () => syncFromPlugin();
    editor.on('transaction', onTransaction);
    return () => {
      window.clearTimeout(timer);
      editor.off('transaction', onTransaction);
      clearSearchState(editor);
    };
    // The search plugin is intentionally bound once to this editor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    const normalized = query;
    setSearchState(editor, normalized, 0);
    const state = getSearchState(editor);
    if (state && state.matches.length > 0) {
      setMatches(state.matches);
      setActive(state.active);
      selectSearchMatch(editor, state.matches[state.active]);
    } else {
      setMatches([]);
      setActive(0);
    }
  }, [editor, query]);

  const goTo = (direction: 1 | -1) => {
    const state = getSearchState(editor);
    if (!state || state.matches.length === 0) return;
    const next = (state.active + direction + state.matches.length) % state.matches.length;
    setSearchState(editor, query, next);
    const updated = getSearchState(editor);
    if (!updated) return;
    setMatches(updated.matches);
    setActive(updated.active);
    const match = updated.matches[updated.active];
    if (match) selectSearchMatch(editor, match);
  };

  const replaceCurrent = () => {
    if (replaceCurrentSearchMatch(editor, replacement)) syncFromPlugin();
  };

  const replaceAll = () => {
    if (replaceAllSearchMatches(editor, replacement) > 0) syncFromPlugin();
  };

  const close = () => {
    clearSearchState(editor);
    onClose();
    window.setTimeout(() => editor.commands.focus(), 0);
  };

  return (
    <div className="find-replace-bar" role="search" aria-label="查找与替换">
      <div className="find-row">
        <Icon name="search" size={15} />
        <input
          ref={inputRef}
          type="search"
          className="find-input"
          aria-label="查找内容"
          placeholder="查找"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              goTo(event.shiftKey ? -1 : 1);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        />
        <span className="find-count" aria-live="polite">
          {matches.length ? `${active + 1} / ${matches.length}` : '0 / 0'}
        </span>
        <button
          type="button"
          className="icon-button find-nav"
          aria-label="上一个匹配"
          title="上一个匹配 (Shift+Enter)"
          onClick={() => goTo(-1)}
          disabled={!matches.length}
        >
          <Icon name="chevron-up" size={15} />
        </button>
        <button
          type="button"
          className="icon-button find-nav"
          aria-label="下一个匹配"
          title="下一个匹配 (Enter)"
          onClick={() => goTo(1)}
          disabled={!matches.length}
        >
          <Icon name="chevron-down" size={15} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="关闭查找替换"
          title="关闭 (Esc)"
          onClick={close}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
      <div className="replace-row">
        <Icon name="replace" size={15} />
        <input
          type="text"
          className="find-input"
          aria-label="替换为"
          placeholder="替换为"
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        />
        <button
          type="button"
          className="find-action"
          onClick={replaceCurrent}
          disabled={!matches.length}
        >
          替换
        </button>
        <button
          type="button"
          className="find-action"
          onClick={replaceAll}
          disabled={!matches.length}
        >
          全部替换
        </button>
      </div>
    </div>
  );
}
