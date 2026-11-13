import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';

export const proofreadingPluginKey = new PluginKey<DecorationSet>('proofreading');

export const Proofreading = Extension.create({
  name: 'proofreading',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: proofreadingPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, current) {
            const next = transaction.getMeta(proofreadingPluginKey) as
              | DecorationSet
              | undefined;
            if (next) return next;
            return current.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return proofreadingPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
