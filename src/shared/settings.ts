export type PresetId = 'default' | 'swap' | 'above-comments' | 'above-related' | 'overlay';

export interface PresetInfo {
  id: PresetId;
  label: string;
  description: string;
}

export const PRESETS: readonly PresetInfo[] = [
  { id: 'default', label: '標準', description: 'YouTube のレイアウトのまま（チャット幅だけ調整可）' },
  { id: 'swap', label: 'チャット左', description: 'チャットとプレイヤーの左右を入れ替える' },
  { id: 'above-comments', label: 'コメントの上', description: '動画の概要欄の下・コメント欄の上にチャットを置き、動画を広げる' },
  { id: 'above-related', label: '関連動画の上', description: '関連動画の列の先頭にチャットを置き、動画を広げる' },
  { id: 'overlay', label: 'オーバーレイ', description: 'チャットを動画の上に浮かべ、動画を最大化する' },
];

/** チャットを差し込み枠に置くプリセット */
export const SLOT_PRESETS: readonly PresetId[] = ['above-comments', 'above-related'];

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
  /** 差し込み枠（コメントの上 / 関連動画の上）に置くときのチャットの高さ(px) */
  chatHeight: number;
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
  chatHeight: 500,
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
