import { Extension } from '@tiptap/core';

/**
 * Block-level typography attributes that are not part of StarterKit.
 * Kept separate from TextKit marks so line height/indent apply to whole blocks.
 */
export const BlockStyle = Extension.create({
  name: 'blockStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
          textIndent: {
            default: null,
            parseHTML: (element) => element.style.textIndent || null,
            renderHTML: (attributes) =>
              attributes.textIndent ? { style: `text-indent: ${attributes.textIndent}` } : {},
          },
        },
      },
    ];
  },
});
