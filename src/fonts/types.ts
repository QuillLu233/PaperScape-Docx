export type FontSource = 'system' | 'imported';

export interface FontRecord {
  id: string;
  name: string;
  path: string;
  source: FontSource;
}

export interface FontSelection {
  name: string;
  source: FontSource | 'default';
  id?: string;
  path?: string;
}

export interface FontConfig {
  ui: FontSelection;
  editor: FontSelection;
}

export const DEFAULT_FONT: FontSelection = {
  name: 'Microsoft YaHei UI',
  source: 'default',
};
