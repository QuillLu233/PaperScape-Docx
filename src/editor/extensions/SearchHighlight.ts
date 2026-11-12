import { Extension, type Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchPluginState {
  query: string;
  matches: SearchMatch[];
  active: number;
  decorations: DecorationSet;
}

export const searchPluginKey = new PluginKey<SearchPluginState>('paperScapeSearch');

export function findSearchMatches(doc: ProseMirrorNode, query: string): SearchMatch[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const needle = normalizedQuery.toLocaleLowerCase();
  const matches: SearchMatch[] = [];
  let currentParent: ProseMirrorNode | null = null;
  let currentText = '';
  let currentPositions: number[] = [];

  const flushBlock = () => {
    if (!currentText) return;
    const haystack = currentText.toLocaleLowerCase();
    let offset = 0;
    while (offset <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, offset);
      if (index === -1) break;
      matches.push({
        from: currentPositions[index],
        to: currentPositions[index + normalizedQuery.length - 1] + 1,
      });
      offset = index + Math.max(needle.length, 1);
    }
    currentText = '';
    currentPositions = [];
  };

  doc.descendants((node, position, parent) => {
    if (!node.isText || !node.text) return;
    const parentName = parent?.type.name;
    if (parentName !== 'paragraph' && parentName !== 'heading') return;
    if (currentParent !== parent) {
      flushBlock();
      currentParent = parent;
    }
    for (let index = 0; index < node.text.length; index += 1) {
      currentText += node.text[index];
      currentPositions.push(position + index);
    }
  });
  flushBlock();

  return matches;
}

function buildState(doc: ProseMirrorNode, query: string, active: number): SearchPluginState {
  const matches = findSearchMatches(doc, query);
  const activeIndex = matches.length ? Math.min(Math.max(active, 0), matches.length - 1) : 0;
  const decorations = DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class: `search-match${index === activeIndex ? ' is-current' : ''}`,
      }),
    ),
  );
  return { query: query.trim(), matches, active: activeIndex, decorations };
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,
        state: {
          init: (_config, state) => buildState(state.doc, '', 0),
          apply: (transaction, value, _oldState, newState) => {
            const meta = transaction.getMeta(searchPluginKey) as
              | { query?: string; active?: number }
              | undefined;
            if (meta) {
              return buildState(newState.doc, meta.query ?? value.query, meta.active ?? value.active);
            }
            if (transaction.docChanged && value.query) {
              return buildState(newState.doc, value.query, value.active);
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});

export function getSearchState(editor: Editor): SearchPluginState | undefined {
  return searchPluginKey.getState(editor.state);
}

export function setSearchState(editor: Editor, query: string, active = 0): void {
  editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, { query, active }));
}

export function clearSearchState(editor: Editor): void {
  setSearchState(editor, '', 0);
}

export function selectSearchMatch(editor: Editor, match: SearchMatch): void {
  editor.commands.setTextSelection({ from: match.from, to: match.to });
  editor.commands.scrollIntoView();
}

export function replaceCurrentSearchMatch(editor: Editor, replacement: string): boolean {
  const state = getSearchState(editor);
  const match = state?.matches[state.active];
  if (!match) return false;
  editor.chain().insertContentAt({ from: match.from, to: match.to }, replacement).run();
  return true;
}

export function replaceAllSearchMatches(editor: Editor, replacement: string): number {
  const state = getSearchState(editor);
  if (!state || state.matches.length === 0) return 0;
  const transaction = editor.state.tr;
  for (let index = state.matches.length - 1; index >= 0; index -= 1) {
    const match = state.matches[index];
    transaction.insertText(replacement, match.from, match.to);
  }
  editor.view.dispatch(transaction);
  return state.matches.length;
}
