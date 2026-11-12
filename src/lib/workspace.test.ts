import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultSnapshot, loadWorkspace, saveWorkspace } from './workspace';
import { countCharactersFromHtml, excerptFromHtml, plainTextToHtml } from './richText';

const STORAGE_KEY = 'paperscape.workspace.v1';

describe('workspace rich-text migration', () => {
  beforeEach(() => localStorage.clear());

  it('converts plain text to paragraphs and preserves line breaks', () => {
    const html = plainTextToHtml('第一段<br>换行\n\n第二段');
    expect(html).toBe('<p>第一段&lt;br&gt;换行</p><p>第二段</p>');
  });

  it('migrates a version 1 plain-text workspace', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        chapters: [
          {
            id: 'legacy',
            title: '旧章节',
            content: '第一段\n\n第二段',
            updatedAt: 0,
          },
        ],
        activeId: 'legacy',
        settings: { fontSize: 18, lineHeight: 1.9 },
      }),
    );

    const snapshot = loadWorkspace();
    expect(snapshot.version).toBe(3);
    expect(snapshot.projectId).toBe('project-default');
    expect(snapshot.chapters[0].content).toBe('<p>第一段</p><p>第二段</p>');
    expect(snapshot.chapters[0].characterCount).toBe(6);
    expect(snapshot.chapters[0].excerpt).toContain('第一段');
    expect(snapshot.settings.editorWidth).toBe(790);
  });

  it('round-trips version 3 HTML and the project identity', () => {
    const snapshot = createDefaultSnapshot();
    saveWorkspace(snapshot);
    const loaded = loadWorkspace();

    expect(loaded.version).toBe(3);
    expect(loaded.projectId).toBe(snapshot.projectId);
    expect(loaded.projectId).toMatch(/^project-/);
    expect(loaded.chapters[0].content).toContain('<p>天还没有完全亮');
    expect(loaded.chapters[0].characterCount).toBe(
      countCharactersFromHtml(loaded.chapters[0].content),
    );
    expect(loaded.settings.editorWidth).toBe(790);
  });

  it('derives excerpts from rich text', () => {
    expect(excerptFromHtml('<p>中文<strong>加粗</strong> English</p>')).toBe('中文加粗 English');
    expect(excerptFromHtml('<p></p>')).toBe('空白章节');
  });
});
