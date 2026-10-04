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
