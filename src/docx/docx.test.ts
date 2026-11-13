import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { importDocx, sanitizeDocxHtml } from './importDocx';
import { buildDocxBuffer } from './exportDocx';
import { inspectDocxRisk } from './inspectDocx';

const fixturePath = path.resolve('docs/fixtures/phase5-sample.docx');

function sampleFile() {
  return new File([fs.readFileSync(fixturePath)], 'phase5-sample.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function allNodes(doc: any, type: string): any[] {
  const result: any[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) result.push(node);
    for (const child of node.content ?? []) visit(child);
  };
  visit(doc);
  return result;
}

describe('DOCX import and export', () => {
  it('imports headings, marks, lists, tables and images from a real DOCX fixture', async () => {
    const original = fs.readFileSync(fixturePath);
    const imported = await importDocx(sampleFile());

    expect(fs.readFileSync(fixturePath).equals(original)).toBe(true);

    expect(imported.doc.type).toBe('doc');
    expect(imported.html).toContain('<h1>');
    expect(imported.html).toContain('<h2>');
    expect(imported.html).toContain('<strong>');
    expect(imported.html).toContain('<em>');
    expect(imported.html).toContain('<ul>');
    expect(imported.html).toContain('<ol>');
    expect(imported.html).toContain('<table>');
    expect(imported.html).toContain('<img');
    expect(imported.text).toContain('中文普通段落');
    expect(imported.text).toContain('English mixed text');
    expect(imported.imageCount).toBe(1);
    expect(imported.tableCount).toBe(1);
    expect(imported.warnings.some((warning) => warning.includes('不会包含'))).toBe(true);

    const headings = allNodes(imported.doc, 'heading');
    expect(headings.some((heading) => heading.attrs?.level === 1)).toBe(true);
    expect(headings.some((heading) => heading.attrs?.level === 2)).toBe(true);
    expect(allNodes(imported.doc, 'bulletList')).toHaveLength(1);
    expect(allNodes(imported.doc, 'orderedList')).toHaveLength(1);
    expect(allNodes(imported.doc, 'table')).toHaveLength(1);
    expect(allNodes(imported.doc, 'image')).toHaveLength(1);
    const textNodes = allNodes(imported.doc, 'text');
    expect(textNodes.some((node) => node.text.includes('粗体内容') && node.marks?.some((mark: any) => mark.type === 'bold'))).toBe(true);
    expect(textNodes.some((node) => node.text.includes('斜体内容') && node.marks?.some((mark: any) => mark.type === 'italic'))).toBe(true);
  });

  it('sanitizes scripts, handlers and external images', () => {
    const dirty = [
      '<p onclick="steal()">safe text</p>',
      '<script>alert(1)</script>',
      '<img src="https://evil.example/tracker.png">',
      '<img src="data:image/png;base64,iVBORw0KGgo=">',
      '<a href="javascript:alert(1)">bad link</a>',
      '<style>body{background:url(https://evil.example)}</style>',
    ].join('');
    const clean = sanitizeDocxHtml(dirty);
    expect(clean).toContain('safe text');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('https://evil.example');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('data:image/png;base64');
  });

  it('exports a real ZIP-based Office Open XML document with A4 page geometry', async () => {
    const imported = await importDocx(sampleFile());
    const exported = await buildDocxBuffer(
      [{ title: '往返测试章节', doc: imported.doc }],
      {
        preset: 'novel',
        pageSize: 'A4',
        fontFamily: 'SimSun',
        fontSize: 12,
        includeTitle: true,
      },
    );

    expect(exported.data[0]).toBe(0x50);
    expect(exported.data[1]).toBe(0x4b);
    const zip = await JSZip.loadAsync(exported.data);
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('word/document.xml')).toBeTruthy();
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('w:pgSz');
    expect(documentXml).toContain('w:w="11906"');
    expect(documentXml).toContain('w:h="16838"');
    expect(documentXml).toContain('SimSun');
  });

  it('round-trips supported content through export and re-import', async () => {
    const first = await importDocx(sampleFile());
    const exported = await buildDocxBuffer(
      [{ title: '往返测试章节', doc: first.doc }],
      {
        preset: 'standard',
        pageSize: 'Letter',
        fontFamily: 'Calibri',
        fontSize: 11,
        includeTitle: true,
      },
    );
    const second = await importDocx(
      new File([exported.data as BlobPart], 'roundtrip.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    expect(second.text).toContain('中文普通段落');
    expect(second.text).toContain('English mixed text');
    expect(second.text).toContain('无序列表项目一');
    expect(second.text).toContain('中文单元格');
    expect(second.imageCount).toBe(1);
    expect(second.tableCount).toBe(1);
    expect(allNodes(second.doc, 'heading').length).toBeGreaterThanOrEqual(2);
    const textNodes = allNodes(second.doc, 'text');
    expect(textNodes.some((node) => node.text.includes('粗体内容') && node.marks?.some((mark: any) => mark.type === 'bold'))).toBe(true);
    expect(textNodes.some((node) => node.text.includes('斜体内容') && node.marks?.some((mark: any) => mark.type === 'italic'))).toBe(true);
    const zip = await JSZip.loadAsync(exported.data);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');
    expect(exported.skippedImages).toBe(0);
  });

  it('rejects a non-DOCX renamed file', async () => {
    await expect(
      importDocx(new File(['<html><body>not a docx</body></html>'], 'fake.docx')),
    ).rejects.toBeTruthy();
  });

  it('marks supported DOCX files as safe for direct overwrite', async () => {
    const report = await inspectDocxRisk(fs.readFileSync(fixturePath));
    expect(report.safeToOverwrite).toBe(true);
    expect(report.warnings).toEqual([]);
  });

  it('detects unsupported DOCX structures before overwriting', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<w:document><w:body><w:ins/><w:txbxContent/><m:oMath/></w:body></w:document>',
    );
    zip.file('word/header1.xml', '<w:hdr/>');
    zip.file('word/vbaProject.bin', 'macro');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const report = await inspectDocxRisk(bytes);
    expect(report.safeToOverwrite).toBe(false);
    expect(report.warnings.some((warning) => warning.includes('修订'))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes('文本框'))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes('公式'))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes('页眉'))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes('宏'))).toBe(true);
  });

  it('exports all chapters with page breaks and no software background', async () => {
    const first = await importDocx(sampleFile());
    const secondDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第二章 合并测试' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '合并导出正文。' }] },
      ],
    };
    const exported = await buildDocxBuffer(
      [
        { title: '第一章 开始', doc: first.doc },
        { title: '第二章 继续', doc: secondDoc },
      ],
      {
        preset: 'novel',
        pageSize: 'A4',
        fontFamily: 'SimSun',
        fontSize: 12,
        includeTitle: true,
      },
    );
    const zip = await JSZip.loadAsync(exported.data);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('第二章 合并测试');
    expect(documentXml).toContain('pageBreakBefore');
    expect(documentXml).not.toContain('<w:background');
    const reimported = await importDocx(
      new File([exported.data as BlobPart], 'all-chapters.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    expect(reimported.text).toContain('第一章 开始');
    expect(reimported.text).toContain('第二章 继续');
    expect(reimported.text).toContain('合并导出正文');
  });
});
