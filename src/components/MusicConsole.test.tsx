import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MusicMini, MusicPanel } from './MusicConsole';
import { DEFAULT_MEDIA_SETTINGS } from '../media/useSystemMedia';
import type { MediaState } from '../media/mediaApi';

const media: MediaState = {
  available: true,
  platform: 'windows-gsmtc',
  sessionId: 'MSEdge',
  sourceAppId: 'MSEdge',
  sourceName: 'Microsoft Edge',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  status: 'playing',
  positionMs: 10000,
  durationMs: 30000,
  cover: '',
  canPlay: false,
  canPause: true,
  canNext: false,
  canPrevious: false,
  canSeek: true,
};

describe('music console', () => {
  it('shows the compact status entry and opens through the callback', () => {
    const onToggle = vi.fn();
    render(
      <MusicMini
        media={media}
        available={media.available}
        settings={DEFAULT_MEDIA_SETTINGS}
        focusMode={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /音乐/ }));
    expect(onToggle).toHaveBeenCalled();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
  });

  it('renders media controls according to capabilities', () => {
    const onControl = vi.fn();
    render(
      <MusicPanel
        open
        focusMode={false}
        media={media}
        sessions={[]}
        settings={DEFAULT_MEDIA_SETTINGS}
        error=""
        loading={false}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        onControl={onControl}
        onSeek={vi.fn()}
        onSelectSession={vi.fn()}
        onFollowAuto={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一首' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一首' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    expect(onControl).toHaveBeenCalledWith('pause');
  });
});
