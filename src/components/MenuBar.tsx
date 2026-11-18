import { useEffect, useRef, useState } from 'react';
import type { ThemeMode, WritingMode } from '../types';
import { Icon } from './Icon';

export interface MenuEntry {
  label?: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

interface MenuDefinition {
  id: string;
  label: string;
  items: MenuEntry[];
}

interface MenuBarProps {
  hasProject: boolean;
  hasDocument: boolean;
  projectName: string;
  documentName: string;
  documentPath: string;
  leftOpen: boolean;
  rightOpen: boolean;
  theme: ThemeMode;
  writingMode: WritingMode;
  focusMode: boolean;
  onNewDocument: () => void;
  onOpenDocx: () => void;
  onOpenFolder: () => void;
  onSaveDocument: () => void;
  onSaveDocumentAs: () => void;
  onRevealDocument: () => void;
  onCloseDocument: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
  onImportDocx: () => void;
  onExportDocx: () => void;
  onNewChapter: () => void;
  onShowHistory: () => void;
  onRenameChapter: () => void;
  onMoveChapter: (direction: 'up' | 'down') => void;
  onDeleteChapter: () => void;
  onSave: () => void;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onFind: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleFocus: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onWritingModeChange: (mode: WritingMode) => void;
  onThemeChange: (mode: ThemeMode) => void;
  uiZoom: number;
  onUiZoomChange: (value: number) => void;
  openLastSession: boolean;
  onOpenLastSessionChange: (value: boolean) => void;
  onChooseDefaultDocumentsDir: () => void;
  onManageFonts: () => void;
  proofreadingEnabled: boolean;
  onToggleProofreading: () => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
}

export function MenuBar({
  hasProject,
  hasDocument,
  projectName,
  documentName,
  documentPath,
  leftOpen,
  rightOpen,
  theme,
  writingMode,
  focusMode,
  onNewDocument,
  onOpenDocx,
  onOpenFolder,
  onSaveDocument,
  onSaveDocumentAs,
  onRevealDocument,
  onCloseDocument,
  onNewProject,
  onOpenProject,
  onCloseProject,
  onImportDocx,
  onExportDocx,
  onNewChapter,
  onShowHistory,
  onRenameChapter,
  onMoveChapter,
  onDeleteChapter,
  onSave,
  onExit,
  onUndo,
  onRedo,
  onSelectAll,
  onFind,
  onToggleLeft,
  onToggleRight,
  onToggleFocus,
  isFullscreen,
  onToggleFullscreen,
  onWritingModeChange,
  onThemeChange,
  uiZoom,
  onUiZoomChange,
  openLastSession,
  onOpenLastSessionChange,
  onChooseDefaultDocumentsDir,
  onManageFonts,
  proofreadingEnabled,
  onToggleProofreading,
  onShowShortcuts,
  onShowAbout,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!hasProject && openMenu === 'chapter') setOpenMenu(null);
  }, [hasProject, openMenu]);

  const menus: MenuDefinition[] = [
    {
      id: 'file',
      label: '文件',
      items: [
        {
          label: hasDocument
            ? `当前文稿：${documentName}`
            : hasProject
              ? `当前项目：${projectName}`
              : '尚未打开文稿',
          disabled: true,
        },
        { separator: true },
        { label: '新建文档', shortcut: 'Ctrl+N', onSelect: onNewDocument },
        { label: '打开文档…', shortcut: 'Ctrl+O', onSelect: onOpenDocx },
        { label: '打开文件夹…', shortcut: 'Ctrl+Shift+O', onSelect: onOpenFolder },
        { separator: true },
        {
          label: '保存',
          shortcut: 'Ctrl+S',
          disabled: !hasProject && !hasDocument,
          onSelect: hasDocument ? onSaveDocument : onSave,
        },
        {
          label: '另存为…',
          shortcut: 'Ctrl+Shift+S',
          disabled: !hasDocument,
          onSelect: onSaveDocumentAs,
        },
        {
          label: '在资源管理器中显示',
          disabled: !hasDocument || !documentPath,
          onSelect: onRevealDocument,
        },
        { label: '设置默认文稿目录…', onSelect: onChooseDefaultDocumentsDir },
        {
          label: '关闭当前文稿',
          disabled: !hasDocument,
          onSelect: onCloseDocument,
        },
        { separator: true },
        { label: '新建项目', shortcut: 'Ctrl+Shift+N', onSelect: onNewProject },
        { label: '打开 V1 项目…', onSelect: onOpenProject },
        {
          label: '关闭项目',
          shortcut: 'Ctrl+W',
          disabled: !hasProject,
          onSelect: onCloseProject,
        },
        { separator: true },
        {
          label: '导入 Word 到项目…',
          disabled: !hasProject,
          onSelect: onImportDocx,
        },
        {
          label: '导出项目 Word…',
          disabled: !hasProject,
          onSelect: onExportDocx,
        },
        { separator: true },
        { label: '退出 PaperScape', onSelect: onExit },
      ],
    },
    {
      id: 'chapter',
      label: '章节',
      items: [
        {
          label: '新建章节',
          shortcut: 'Ctrl+N',
          disabled: !hasProject,
          onSelect: onNewChapter,
        },
        {
          label: '重命名当前章节',
          shortcut: 'F2',
          disabled: !hasProject,
          onSelect: onRenameChapter,
        },
        {
          label: '上移当前章节',
          disabled: !hasProject,
          onSelect: () => onMoveChapter('up'),
        },
        {
          label: '下移当前章节',
          disabled: !hasProject,
          onSelect: () => onMoveChapter('down'),
        },
        { separator: true },
        {
          label: '历史版本',
          disabled: !hasProject,
          onSelect: onShowHistory,
        },
        {
          label: '删除当前章节',
          disabled: !hasProject,
          onSelect: onDeleteChapter,
        },
      ],
    },
    {
      id: 'edit',
      label: '编辑',
      items: [
        { label: '撤销', shortcut: 'Ctrl+Z', onSelect: onUndo },
        { label: '重做', shortcut: 'Ctrl+Shift+Z', onSelect: onRedo },
        { separator: true },
        { label: '全选正文', shortcut: 'Ctrl+A', onSelect: onSelectAll },
        { label: '查找与替换', shortcut: 'Ctrl+F', onSelect: onFind },
      ],
    },
    {
      id: 'view',
      label: '视图',
      items: [
        { label: '文件树', shortcut: 'Ctrl+B', checked: leftOpen, disabled: !hasProject && !hasDocument, onSelect: onToggleLeft },
        {
          label: '设置面板',
          shortcut: 'Ctrl+Shift+B',
          checked: rightOpen,
          disabled: !hasProject,
          onSelect: onToggleRight,
        },
        {
          label: '专注写作',
          shortcut: 'Ctrl+Shift+F',
          checked: focusMode,
          disabled: !hasProject && !hasDocument,
          onSelect: onToggleFocus,
        },
        {
          label: '全屏',
          shortcut: 'F11',
          checked: isFullscreen,
          onSelect: onToggleFullscreen,
        },
        { separator: true },
        {
          label: '沉浸式模式',
          checked: writingMode === 'immersive',
          disabled: !hasProject,
          onSelect: () => onWritingModeChange('immersive'),
        },
        {
          label: '纸张式模式',
          checked: writingMode === 'paper',
          disabled: !hasProject,
          onSelect: () => onWritingModeChange('paper'),
        },
        { separator: true },
        { label: '浅色主题', checked: theme === 'light', onSelect: () => onThemeChange('light') },
        { label: '深色主题', checked: theme === 'dark', onSelect: () => onThemeChange('dark') },
        {
          label: '跟随系统',
          checked: theme === 'system',
          onSelect: () => onThemeChange('system'),
        },
        { separator: true },
        ...[100, 110, 125, 150].map((value) => ({
          label: `界面缩放 ${value}%`,
          checked: uiZoom === value,
          onSelect: () => onUiZoomChange(value),
        })),
        { separator: true },
        {
          label: '启动时打开上次项目',
          checked: openLastSession,
          onSelect: () => onOpenLastSessionChange(!openLastSession),
        },
        { separator: true },
        {
          label: '中文校对',
          checked: proofreadingEnabled,
          onSelect: onToggleProofreading,
        },
        { label: '字体管理…', onSelect: onManageFonts },
      ],
    },
    {
      id: 'help',
      label: '帮助',
      items: [
        { label: '键盘快捷键', onSelect: onShowShortcuts },
        { label: '关于纸境', onSelect: onShowAbout },
      ],
    },
  ];

  const choose = (entry: MenuEntry) => {
    if (entry.disabled) return;
    setOpenMenu(null);
    entry.onSelect?.();
  };

  return (
    <div className="menubar" ref={rootRef}>
      {menus.map((menu) => (
        <div className="menu-root" key={menu.id}>
          <button
            type="button"
            className={`menu-trigger${openMenu === menu.id ? ' is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={openMenu === menu.id}
            disabled={menu.id === 'chapter' && !hasProject}
            title={
              menu.id === 'chapter' && !hasProject
                ? '章节管理仅适用于 V1 项目；当前是 DOCX 文件模式'
                : undefined
            }
            onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            onPointerEnter={() => {
              if (openMenu && !(menu.id === 'chapter' && !hasProject)) setOpenMenu(menu.id);
            }}
          >
            {menu.label}
          </button>
          {openMenu === menu.id && !(menu.id === 'chapter' && !hasProject) && (
            <div className="menu-surface" role="menu" aria-label={`${menu.label}菜单`}>
              {menu.items.map((entry, index) =>
                entry.separator ? (
                  <div className="menu-separator" role="separator" key={`separator-${index}`} />
                ) : (
                  <button
                    type="button"
                    className="menu-item"
                    key={entry.label}
                    role={entry.checked === undefined ? 'menuitem' : 'menuitemradio'}
                    aria-checked={entry.checked}
                    disabled={entry.disabled}
                    onClick={() => choose(entry)}
                  >
                    <span className="menu-check">
                      {entry.checked ? <Icon name="check" size={13} /> : null}
                    </span>
                    <span className="menu-label">{entry.label}</span>
                    {entry.shortcut ? <span className="menu-shortcut">{entry.shortcut}</span> : null}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
