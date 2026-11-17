import type { EditorView } from '@tiptap/pm/view';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Move or copy a ProseMirror slice in one transaction, so the native undo
 * history treats the operation as a single edit and inline marks/blocks are
 * preserved by the schema.
 */
export function moveEditorText(
  view: EditorView,
  from: number,
  to: number,
  dropAt: number,
  copy = false,
): boolean {
  if (from >= to || dropAt < 0) return false;
  if (!copy && dropAt >= from && dropAt <= to) return false;

  const state = view.state;
  if (dropAt > state.doc.content.size) return false;
  const slice = state.doc.slice(from, to);
  if (slice.content.size === 0) return false;

  const tr = state.tr;
  let target = dropAt;
  if (!copy) {
    tr.delete(from, to);
    if (dropAt > to) target -= to - from;
  }
  tr.replace(target, target, slice);

  const max = tr.doc.content.size;
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(target, max))));
  view.dispatch(tr);
  view.focus();
  return true;
}
