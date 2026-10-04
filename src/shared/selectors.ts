/**
 * YouTube 側の DOM に依存するセレクタ・属性名はすべてここに集約する。
 * YouTube の仕様変更で壊れた場合はまずここ（と static/content.css）を確認する。
 *
 * チャット (ytd-live-chat-frame#chat) は表示モードで親が変わる:
 *   通常      : #columns > #secondary > #secondary-inner > #chat-container
 *   シアター  : #columns > #chat-container
 *   全画面    : #full-bleed-container > #panels-full-bleed-container > #chat-container
 * そのため親要素には依存せず、チャット要素と ytd-watch-flexy の属性だけを見る。
 */
export const SEL = {
  watchFlexy: 'ytd-watch-flexy',
  chatFrame: 'ytd-live-chat-frame#chat',
  chatToggleButton: 'ytd-live-chat-frame#chat #show-hide-button button',
  /** 「コメントの上」: この要素を含むボックスの直後に枠を差し込む（コメント欄はその次のボックス） */
  watchMetadata: 'ytd-watch-flexy #below ytd-watch-metadata',
  /** 「関連動画の上」: この要素の直前に枠を差し込む */
  related: 'ytd-watch-flexy #secondary-inner > #related',
} as const;

/** ytd-watch-flexy に付く状態属性 */
export const FLEXY_ATTR = {
  chatOpen: 'live-chat-present-and-expanded',
  theater: 'theater',
  fullscreen: 'fullscreen',
  fixedPanels: 'fixed-panels',
  squeezeback: 'squeezeback',
  twoColumns: 'is-two-columns_',
} as const;

/** 変化したらレイアウト再計算が必要になる属性 */
export const FLEXY_WATCHED_ATTRS: string[] = Object.values(FLEXY_ATTR);
