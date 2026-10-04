import type { RoleId } from './selectors';

export type Message =
  | { type: 'toggle-chat' }
  /** 設定画面 → YouTube タブ: セレクタの一致数を数える（役割の scope に合うフレームだけが応答する） */
  | { type: 'count-selector'; role: RoleId; selector: string }
  /** 設定画面 → YouTube タブ: 要素ピッカーを起動する */
  | { type: 'start-picker'; role: RoleId }
  /** YouTube タブ → 設定画面: ピッカーが終了した（selector が null ならキャンセル） */
  | { type: 'picker-done'; role: RoleId; selector: string | null };

export interface CountResult {
  count: number;
  valid: boolean;
}
