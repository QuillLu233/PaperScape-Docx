import { generateJSON } from '@tiptap/core';
import { createEditorExtensions } from '../editor/editorConfig';
import { loadWorkspace } from '../lib/workspace';
import type { JSONContent } from '@tiptap/core';

export interface LegacyChapter {
  title: string;
  doc: JSONContent;
  characterCount: number;
  excerpt: string;
}

const LEGACY_KEY = 'paperscape.workspace.v1';

export function hasLegacyWorkspace(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem(LEGACY_KEY));
}

export function loadLegacyChapters(): LegacyChapter[] {
  if (!hasLegacyWorkspace()) return [];
  const snapshot = loadWorkspace();
  const extensions = createEditorExtensions();
  return snapshot.chapters.map((chapter) => {
    let doc: JSONContent;
    try {
      doc = generateJSON(chapter.content, extensions) as JSONContent;
    } catch {
      doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: chapter.content
              ? [{ type: 'text', text: chapter.content.replace(/<[^>]+>/g, ' ') }]
              : undefined,
          },
        ],
      };
    }
    return {
      title: chapter.title || '旧稿章节',
      doc,
      characterCount: chapter.characterCount,
      excerpt: chapter.excerpt,
    };
  });
}
