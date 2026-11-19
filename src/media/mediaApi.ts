import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../project/api';

export interface MediaSessionSummary {
  id: string;
  sourceAppId: string;
  sourceName: string;
  title: string;
  artist: string;
  album: string;
  status: string;
  isCurrent: boolean;
}

export interface MediaState {
  available: boolean;
  platform: string;
  sessionId: string;
  sourceAppId: string;
  sourceName: string;
  title: string;
  artist: string;
  album: string;
  status: string;
  positionMs: number;
  durationMs: number;
  cover: string;
  canPlay: boolean;
  canPause: boolean;
  canNext: boolean;
  canPrevious: boolean;
  canSeek: boolean;
}

export async function mediaAvailable(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>('media_available');
}

export async function mediaSessions(): Promise<MediaSessionSummary[]> {
  if (!isTauriRuntime()) return [];
  return invoke<MediaSessionSummary[]>('media_sessions');
}

export async function mediaState(sessionId: string): Promise<MediaState> {
  if (!isTauriRuntime()) throw new Error('当前平台不支持系统媒体');
  return invoke<MediaState>('media_state', { sessionId });
}

export async function mediaControl(sessionId: string, action: string): Promise<boolean> {
  return invoke<boolean>('media_control', { sessionId, action });
}

export async function mediaSeek(sessionId: string, positionMs: number): Promise<boolean> {
  return invoke<boolean>('media_seek', { sessionId, positionMs });
}
