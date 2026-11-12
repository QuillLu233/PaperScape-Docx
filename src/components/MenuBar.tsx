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
  projectName: string;
  leftOpen: boolean;
  rightOpen: boolean;
  theme: ThemeMode;
  writingMode: WritingMode;
  focusMode: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
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
  onWritingModeChange: (mode: WritingMode) => void;
  onThemeChange: (mode: ThemeMode) => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
}

export function MenuBar({
  hasProject,
  projectName,
  leftOpen,
  rightOpen,
  theme,
  writingMode,
  focusMode,
  onNewProject,
  onOpenProject,
  onCloseProject,
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
  onWritingModeChange,
  onThemeChange,
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

  const menus: MenuDefinition[] = [
    {
      id: 'file',
      label: '文件',
      items: [
        {
          label: hasProject ? `当前项目：${projectName}` : '尚未打开项目',
          disabled: true,
        },
        { separator: true },
        { label: '新建项目', shortcut: 'Ctrl+Shift+N', onSelect: onNewProject },
        { label: '打开项目', shortcut: 'Ctrl+O', onSelect: onOpenProject },
        {
          label: '关闭项目',
          shortcut: 'Ctrl+W',
          disabled: !hasProject,
          onSelect: onCloseProject,
        },
        { separator: true },
        { label: '保存项目', shortcut: 'Ctrl+S', disabled: !hasProject, onSelect: onSave },
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
        { label: '章节目录', shortcut: 'Ctrl+B', checked: leftOpen, disabled: !hasProject, onSelect: onToggleLeft },
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
          disabled: !hasProject,
          onSelect: onToggleFocus,
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
      ],
    },
    {
      id: 'help',
      label: '帮助',
      items: [
        { label: '键盘快捷键', onSelect: onShowShortcuts },
        { label: '关于 PaperScape', onSelect: onShowAbout },
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
            onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            onPointerEnter={() => {
              if (openMenu) setOpenMenu(menu.id);
            }}
          >
            {menu.label}
          </button>
          {openMenu === menu.id && (
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
