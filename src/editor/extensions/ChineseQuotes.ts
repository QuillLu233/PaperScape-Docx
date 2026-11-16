import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

const OPEN_CONTEXT = /[：:（(【\[《「]$/;
const CLOSING_AFTER = /^[\s。！？；：，、）】》」…]/;

function countOpenQuotes(text: string): number {
  let depth = 0;
  for (const char of text) {
    if (char === '“') depth += 1;
    else if (char === '”') depth = Math.max(0, depth - 1);
  }
  return depth;
}

/**
 * Decide the intended orientation of a Chinese double quote from the text
 * around the caret. Only correct an unambiguously reversed quote; ambiguous
 * nested dialogue is left exactly as typed.
 */
export function normalizeChineseQuote(
  before: string,
  after: string,
  typed: '“' | '”',
): '“' | '”' {
  const right = after.slice(0, 1);
  const trimmedBefore = before.trimEnd();
  const opensHere = trimmedBefore === '' || OPEN_CONTEXT.test(trimmedBefore);
  const depth = countOpenQuotes(before);

  if (opensHere) return '“';
  if (depth > 0) return '”';
  if (typed === '“') return '“';
  if (right === '' || CLOSING_AFTER.test(right)) return '”';
  return typed;
}

export const ChineseQuotes = Extension.create({
  name: 'paperScapeChineseQuotes',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput(view, from, to, text) {
            if (view.composing || (text !== '“' && text !== '”')) return false;
            const resolved = view.state.doc.resolve(from);
            const parent = resolved.parent;
            const before = parent.textBetween(0, resolved.parentOffset, ' ', ' ');
            const after = parent.textBetween(
              resolved.parentOffset + (to - from),
              parent.content.size,
              ' ',
              ' ',
            );
            const corrected = normalizeChineseQuote(before, after, text);
            if (corrected === text) return false;
            view.dispatch(view.state.tr.insertText(corrected, from, to));
            return true;
          },
        },
      }),
    ];
  },
});
