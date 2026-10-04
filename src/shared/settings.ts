export type PresetId = 'default' | 'swap' | 'overlay';

export interface PresetInfo {
  id: PresetId;
  label: string;
  description: string;
}

export const PRESETS: readonly PresetInfo[] = [
  { id: 'default', label: '標準', description: 'YouTube のレイアウトのまま（チャット幅だけ調整可）' },
  { id: 'swap', label: 'チャット左', description: 'チャットとプレイヤーの左右を入れ替える' },
  { id: 'overlay', label: 'オーバーレイ', description: 'チャットを動画の上に浮かべ、動画を最大化する' },
];

/** オーバーレイ時のチャット矩形。ビューポートに対する % で保持する */
export interface OverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Settings {
  enabled: boolean;
  preset: PresetId;
  /** 横並び時のチャット幅(px)。0 は YouTube 既定 */
  chatWidth: number;
  overlay: OverlayRect;
  /** オーバーレイ時のチャット背景の不透明度 (0〜1) */
  overlayBgAlpha: number;
  /** チャット文字の拡大率 */
  chatFontScale: number;
  hideChatHeader: boolean;
  hideChatInput: boolean;
  hideTicker: boolean;
}

export const DEFAULT_OVERLAY: OverlayRect = { x: 72, y: 10, w: 26, h: 70 };

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  preset: 'default',
  chatWidth: 0,
  overlay: DEFAULT_OVERLAY,
  overlayBgAlpha: 0.35,
  chatFontScale: 1,
  hideChatHeader: false,
  hideChatInput: false,
  hideTicker: false,
};

const STORAGE_KEY = 'settings';

function normalize(value: unknown): Settings {
  const v = (value ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    overlay: { ...DEFAULT_OVERLAY, ...(v.overlay ?? {}) },
  };
}

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return normalize(result[STORAGE_KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

export function onSettingsChanged(callback: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      callback(normalize(changes[STORAGE_KEY].newValue));
    }
  });
}
