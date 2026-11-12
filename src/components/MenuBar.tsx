import { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../types';
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
  leftOpen: boolean;
  rightOpen: boolean;
  theme: ThemeMode;
  onNewChapter: () => void;
  onSave: () => void;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onFind: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
}

export function MenuBar({
  leftOpen,
  rightOpen,
  theme,
  onNewChapter,
  onSave,
  onExit,
  onUndo,
  onRedo,
  onSelectAll,
  onFind,
  onToggleLeft,
  onToggleRight,
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
        { label: '新建章节', shortcut: 'Ctrl+N', onSelect: onNewChapter },
        { label: '保存到本地', shortcut: 'Ctrl+S', onSelect: onSave },
        { separator: true },
        { label: '退出 PaperScape', onSelect: onExit },
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
        { label: '章节目录', shortcut: 'Ctrl+B', checked: leftOpen, onSelect: onToggleLeft },
        {
          label: '设置面板',
          shortcut: 'Ctrl+Shift+B',
          checked: rightOpen,
          onSelect: onToggleRight,
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
