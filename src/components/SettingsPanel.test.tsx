import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { DEFAULT_APPEARANCE } from '../appearance/presets';
import { DEFAULT_SETTINGS } from '../types';

const baseProps = {
  open: true,
  documentMode: true,
  theme: 'light' as const,
  settings: DEFAULT_SETTINGS,
  appearance: DEFAULT_APPEARANCE,
  savedThemes: [],
  focusMode: false,
  onThemeChange: vi.fn(),
  onSettingsChange: vi.fn(),
  onModeChange: vi.fn(),
  onBackgroundChange: vi.fn(),
  onReadingOpacityChange: vi.fn(),
  onPaperChange: vi.fn(),
  onApplyPreset: vi.fn(),
  onApplySavedTheme: vi.fn(),
  onDeleteSavedTheme: vi.fn(),
  onSaveTheme: vi.fn(),
  onChooseImage: vi.fn(async () => undefined),
  defaultDocumentsDir: 'C:\\Users\\Test\\Documents\\PaperScape',
  onChooseDefaultDocumentsDir: vi.fn(),
  uiZoom: 110,
  onUiZoomChange: vi.fn(),
  openLastSession: true,
  onOpenLastSessionChange: vi.fn(),
  onManageFonts: vi.fn(),
  proofreadingEnabled: true,
  proofreadingDictionaryCount: 0,
  proofreadingIgnoredCount: 0,
  onProofreadingEnabledChange: vi.fn(),
  onClearProofreadingDictionary: vi.fn(),
  onClearProofreadingIgnored: vi.fn(),
  onToggleFocus: vi.fn(),
  onClose: vi.fn(),
};

describe('SettingsPanel document mode', () => {
  it('shows app-wide settings without project-only appearance controls', () => {
    render(<SettingsPanel {...baseProps} />);
    expect(screen.getByText('文件模式')).toBeInTheDocument();
    expect(screen.getByText('外观主题')).toBeInTheDocument();
    expect(screen.getByText('界面')).toBeInTheDocument();
    expect(screen.getByText('中文校对')).toBeInTheDocument();
    expect(screen.queryByText('正文排版')).not.toBeInTheDocument();
    expect(screen.queryByText('写作模式')).not.toBeInTheDocument();
  });
});
