/**
 * YouTube 側への依存はこのファイルに集約する。
 *
 * - ROLES: 拡張が扱う要素の「役割」と既定セレクタ。ユーザーは設定画面で上書きできる。
 *   JS が一致した要素に data-ytcl-<役割ID> 属性を付け、CSS はその属性だけを対象にする。
 * - STATE_ATTRS: 視聴ページ (role: watch) に付く状態属性。<html> の ytcl-s-<名前> class に写す。
 *
 * これ以外の YouTube 依存として、static/content.css と static/chat.css で
 * YouTube 内部の CSS 変数やプロパティ（サイドバー幅、transform、min-height など）を上書きしている。
 *
 * チャット (role: chat) は表示モードで YouTube 自身が DOM 上の位置を移動させる:
 *   通常      : #columns > #secondary > #secondary-inner > #chat-container
 *   シアター  : #columns > #chat-container
 *   全画面    : #full-bleed-container > #panels-full-bleed-container > #chat-container
 * そのため拡張は DOM を動かさず、親要素にも依存しない。
 */

export type RoleScope = 'page' | 'chat';

export interface RoleDef {
  id: string;
  label: string;
  hint: string;
  /** page: 視聴ページ / chat: チャット iframe (/live_chat, /live_chat_replay) の中 */
  scope: RoleScope;
  defaultSelector: string;
  /** 通常 1 要素だけに一致するべきか（設定画面・ピッカーの目安表示に使う） */
  single: boolean;
}

const role = (
  id: string,
  scope: RoleScope,
  label: string,
  hint: string,
  defaultSelector: string,
  single = true,
) => ({ id, scope, label, hint, defaultSelector, single });

export const ROLES = [
  role('watch', 'page', '視聴ページ', 'シアター・全画面などの状態を示す属性を持つ要素', 'ytd-watch-flexy'),
  role('columns', 'page', '下段の列', 'プレイヤー下の左右の列をまとめる要素（左右の入れ替えに使用）', 'ytd-watch-flexy #columns'),
  role('secondary', 'page', '右の列', '関連動画などが入る右側の列', 'ytd-watch-flexy #secondary'),
  role('full-bleed', 'page', 'シアター時の上段', 'シアター・全画面時にプレイヤーとチャットが横に並ぶ要素', 'ytd-watch-flexy #full-bleed-container'),
  role('panels-full-bleed', 'page', 'シアター時のチャット領域', 'シアター・全画面時にプレイヤーの横でチャットが入る領域', 'ytd-watch-flexy #panels-full-bleed-container'),
  role('chat', 'page', 'チャット', 'チャット欄の外枠（チャットの iframe を含む要素）', 'ytd-live-chat-frame#chat'),
  role('chat-toggle', 'page', 'チャット開閉ボタン', 'チャットの表示/非表示を切り替えるボタン（またはそれを含む要素）', 'ytd-live-chat-frame#chat #show-hide-button'),
  role('description', 'page', '概要欄', '「コメントの上」ではこの要素の直後にチャットを置く', 'ytd-watch-flexy #below ytd-watch-metadata'),
  role('related', 'page', '関連動画', '「関連動画の上」ではこの要素の直前にチャットを置く', 'ytd-watch-flexy #secondary-inner > #related'),
  role('chat-app', 'chat', 'チャット本体', '背景色を持つチャット全体の要素（オーバーレイ時の半透明化に使用）', 'yt-live-chat-renderer'),
  role('chat-header', 'chat', 'チャットのヘッダー', '「ヘッダーを隠す」で非表示にする要素', 'yt-live-chat-header-renderer'),
  role('chat-items', 'chat', 'メッセージ一覧', '文字サイズと文字の縁取りを適用する要素', '#items.yt-live-chat-item-list-renderer'),
  role('chat-input', 'chat', 'チャットの入力欄', '「入力欄を隠す」で非表示にする要素（複数可）', '#input-panel, #panel-pages', false),
  role('chat-ticker', 'chat', 'ティッカー', '「ティッカーを隠す」で非表示にするスーパーチャットの帯', '#ticker'),
] as const satisfies readonly RoleDef[];

export type RoleId =
  | 'watch' | 'columns' | 'secondary' | 'full-bleed' | 'panels-full-bleed' | 'chat' | 'chat-toggle'
  | 'description' | 'related' | 'chat-app' | 'chat-header' | 'chat-items' | 'chat-input' | 'chat-ticker';

export function getRole(id: RoleId): RoleDef {
  return ROLES.find((r) => r.id === id)!;
}

/** 役割の要素に付ける目印の属性名 */
export const roleAttr = (id: RoleId) => `data-ytcl-${id}`;

/** 視聴ページ (role: watch) の状態属性。キーは <html> の ytcl-s-<キー> class になる */
export const STATE_ATTRS = {
  'chat-open': 'live-chat-present-and-expanded',
  theater: 'theater',
  fullscreen: 'fullscreen',
  'fixed-panels': 'fixed-panels',
  squeezeback: 'squeezeback',
} as const;
