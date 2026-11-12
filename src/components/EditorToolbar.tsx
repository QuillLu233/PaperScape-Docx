import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS } from '../editor/editorConfig';
import { imageFileToDataUrl } from '../editor/image';
import { Icon } from './Icon';

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
  className = '',
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`toolbar-button${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="toolbar-separator" aria-hidden="true" />;
}

export function EditorToolbar({ editor, onFind }: { editor: Editor | null; onFind: () => void }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const textStyle = current.getAttributes('textStyle');
      const block = current.isActive('heading')
        ? current.getAttributes('heading')
        : current.getAttributes('paragraph');
      return {
        heading: current.isActive('heading', { level: 1 })
          ? 'h1'
          : current.isActive('heading', { level: 2 })
            ? 'h2'
            : current.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p',
        bold: current.isActive('bold'),
        italic: current.isActive('italic'),
        underline: current.isActive('underline'),
        strike: current.isActive('strike'),
        align: current.isActive({ textAlign: 'center' })
          ? 'center'
          : current.isActive({ textAlign: 'right' })
            ? 'right'
            : current.isActive({ textAlign: 'justify' })
              ? 'justify'
              : 'left',
        bulletList: current.isActive('bulletList'),
        orderedList: current.isActive('orderedList'),
        fontFamily: typeof textStyle.fontFamily === 'string' ? textStyle.fontFamily : '',
        fontSize: typeof textStyle.fontSize === 'string' ? textStyle.fontSize : '',
        color: typeof textStyle.color === 'string' ? textStyle.color : '',
        lineHeight: typeof block.lineHeight === 'string' ? block.lineHeight : '',
        indent: block.textIndent === '2em',
        inTable: current.isActive('table'),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      };
    },
  });

  const disabled = !editor || !state;

  if (!editor) {
    return <div className="editor-toolbar editor-toolbar-loading" aria-label="富文本工具栏" />;
  }

  const setBlockAttribute = (attribute: 'lineHeight' | 'textIndent', value: string | null) => {
    const chain = editor.chain().focus();
    if (editor.isActive('heading')) chain.updateAttributes('heading', { [attribute]: value });
    chain.updateAttributes('paragraph', { [attribute]: value }).run();
  };

  const onImagePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageError('');
    try {
      const source = await imageFileToDataUrl(file);
      editor.chain().focus().setImage({ src: source, alt: file.name }).run();
    } catch (error) {
      setImageError(error instanceof Error ? error.message : '图片插入失败');
    }
  };

  return (
    <div className="editor-toolbar-wrap">
      <div className="editor-toolbar" role="toolbar" aria-label="富文本工具栏">
        <select
          className="toolbar-select paragraph-select"
          aria-label="段落格式"
          title="段落格式"
          value={state?.heading ?? 'p'}
          onChange={(event) => {
            const value = event.target.value;
            if (value === 'p') {
              editor.chain().focus().setParagraph().run();
            } else {
              const level = Number(value.slice(1)) as 1 | 2 | 3;
              editor.chain().focus().setHeading({ level }).run();
            }
          }}
        >
          <option value="p">正文</option>
          <option value="h1">标题 1</option>
          <option value="h2">标题 2</option>
          <option value="h3">标题 3</option>
        </select>

        <div className="toolbar-group" role="group" aria-label="文字格式">
          <ToolbarButton
            label="加粗 (Ctrl+B)"
            active={state?.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="format-letter format-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            label="斜体 (Ctrl+I)"
            active={state?.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="format-letter format-italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="下划线 (Ctrl+U)"
            active={state?.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="format-letter format-underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            label="删除线"
            active={state?.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <span className="format-letter format-strike">S</span>
          </ToolbarButton>
        </div>

        <Separator />

        <select
          className="toolbar-select font-select"
          aria-label="字体"
          title="字体"
          value={state?.fontFamily ?? ''}
          onChange={(event) => {
            const family = event.target.value;
            if (family) editor.chain().focus().setFontFamily(family).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          className="toolbar-select size-select"
          aria-label="字号"
          title="字号"
          value={state?.fontSize ?? ''}
          onChange={(event) => {
            const size = event.target.value;
            if (size) editor.chain().focus().setFontSize(size).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
        >
          <option value="">默认</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={`${size}px`}>
              {size}
            </option>
          ))}
        </select>

        <label className="color-control" title="文字颜色" aria-label="文字颜色">
          <span
            className="color-swatch"
            style={{ backgroundColor: state?.color || 'var(--ink)' }}
            aria-hidden="true"
          />
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(state?.color ?? '') ? state!.color : '#2b2f28'}
            aria-label="选择文字颜色"
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>

        <Separator />

        <div className="toolbar-group" role="group" aria-label="段落对齐">
          {(
            [
              ['left', 'align-left', '左对齐'],
              ['center', 'align-center', '居中'],
              ['right', 'align-right', '右对齐'],
              ['justify', 'align-justify', '两端对齐'],
            ] as const
          ).map(([align, icon, label]) => (
            <ToolbarButton
              key={align}
              label={label}
              active={state?.align === align}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
            >
              <Icon name={icon} size={16} />
            </ToolbarButton>
          ))}
        </div>

        <div className="toolbar-group" role="group" aria-label="列表">
          <ToolbarButton
            label="无序列表"
            active={state?.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <Icon name="bullet-list" size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="有序列表"
            active={state?.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <Icon name="ordered-list" size={16} />
          </ToolbarButton>
        </div>

        <select
          className="toolbar-select leading-select"
          aria-label="段落行距"
          title="段落行距"
          value={state?.lineHeight ?? ''}
          onChange={(event) => setBlockAttribute('lineHeight', event.target.value || null)}
        >
          {LINE_HEIGHTS.map((item) => (
            <option key={item.label} value={item.value}>
              行距 {item.label}
            </option>
          ))}
        </select>

        <ToolbarButton
          label="首行缩进"
          active={state?.indent}
          onClick={() => setBlockAttribute('textIndent', state?.indent ? null : '2em')}
        >
          <Icon name="indent" size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton label="插入图片" onClick={() => imageInputRef.current?.click()}>
          <Icon name="image" size={16} />
        </ToolbarButton>
        <input
          ref={imageInputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          aria-label="选择图片文件"
          onChange={(event) => void onImagePicked(event)}
        />

        <ToolbarButton
          label={state?.inTable ? '插入 3×3 表格' : '插入表格'}
          active={state?.inTable}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Icon name="table" size={16} />
        </ToolbarButton>
        {state?.inTable ? (
          <div className="toolbar-group table-actions" role="group" aria-label="表格操作">
            <button
              type="button"
              className="toolbar-text-button"
              title="向下添加一行"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              +行
            </button>
            <button
              type="button"
              className="toolbar-text-button"
              title="向右添加一列"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              +列
            </button>
            <button
              type="button"
              className="toolbar-text-button danger-text"
              title="删除当前表格"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              删表
            </button>
          </div>
        ) : null}

        <span className="toolbar-spacer" />

        <ToolbarButton label="查找与替换 (Ctrl+F)" onClick={onFind}>
          <Icon name="search" size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="撤销 (Ctrl+Z)"
          disabled={disabled || !state?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Icon name="undo" size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="重做 (Ctrl+Shift+Z)"
          disabled={disabled || !state?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Icon name="redo" size={16} />
        </ToolbarButton>
      </div>
      {imageError ? (
        <p className="toolbar-error" role="alert">
          {imageError}
        </p>
      ) : null}
    </div>
  );
}
