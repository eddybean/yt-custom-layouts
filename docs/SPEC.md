# YT Custom Layouts 仕様書

YouTube の生配信・アーカイブ視聴ページで、ライブチャットの位置やサイズを自由に変え、動画の表示領域を広げる Chrome 拡張 (Manifest V3)。

- 最終更新: 2026-10-04（v0.3.0）
- 対象: `https://www.youtube.com/watch?v=*` のうちライブチャット / チャットリプレイがあるページ

---

## 1. 調査結果（YouTube 側の仕組み）

2026-10-04 時点で、内蔵ブラウザと実際の Chrome の両方で確認した内容。

### 1.1 ページ種別ごとの違い

| | 通常動画 | 生配信 | アーカイブ（チャットリプレイ） |
|---|---|---|---|
| チャット | なし | `ytd-live-chat-frame#chat` | 同左 |
| iframe の中身 | – | `/live_chat` | `/live_chat_replay` |
| コメント欄 | あり | なし | あり |
| `ytd-watch-flexy` の属性 | `response-has-comments` | `should-stamp-chat` `live-chat-present-and-expanded` `panel-expanded` | 両方 |

iframe は youtube.com と同一オリジンなので、拡張から中に介入できる（`all_frames` のコンテンツスクリプトで対応）。

### 1.2 表示モードごとのチャットの位置

チャットは**表示モードによって YouTube 自身が DOM 上の位置を移動させる**（iframe は再読み込みされない）。

| モード | `ytd-watch-flexy` に付く属性 | チャットの親要素 | 配置 |
|---|---|---|---|
| 通常 | `is-two-columns_` | `#columns > #secondary > #secondary-inner > #chat-container` | 右カラム上部（高さ固定） |
| シアター | `theater` `squeezeback` `fixed-panels` `full-bleed-player` | `#columns > #chat-container` | 画面右端に全高で `position: fixed`。プレイヤーはチャット幅分縮む |
| 全画面 | `fullscreen` `squeezeback` `full-bleed-player` | `#full-bleed-container > #panels-full-bleed-container > #chat-container` | プレイヤーの右に全高で並ぶ |
| 幅が狭い | `is-single-column`（シアターと併用されることもある） | 上記と同じ | シアター時は同様に右端に固定 |

- 全画面化される要素は `<html>`（ページ全体）。拡張が置いた fixed 要素も全画面中にそのまま表示される。
- `#panels-full-bleed-container` には `transform` が掛かっており、中の fixed 要素の基準になってしまう。
- チャットを閉じると `ytd-live-chat-frame[collapsed]` になり、iframe は `about:blank` に切り替わる（再表示で読み込み直し）。

### 1.3 レイアウトを動かしている CSS

| 要素 | 仕組み |
|---|---|
| チャット幅 | `ytd-watch-flexy` の CSS 変数 `--ytd-watch-flexy-sidebar-width`。YouTube が resize のたびにインラインで書き戻すため、スタイルシート側の `!important` で上書きする |
| シアター時のチャット | `ytd-watch-flexy[fixed-panels] #chat { position: fixed; right: 0; width: var(--ytd-watch-flexy-sidebar-width); transition: top .3s }` |
| シアター時のプレイヤー | `#full-bleed-container`（flex）内で `#player-full-bleed-container` と `#panels-full-bleed-container` が横に並ぶ |
| シアター時の下段 | `ytd-watch-flexy[fixed-panels] #columns { padding-right: var(--ytd-watch-flexy-sidebar-width) }` |

参考: YouTube 側には別系統の `ytd-watch-grid`（A/B テスト中と思われる）のスタイルも存在する。現状は未対応。

---

## 2. 基本方針

1. **DOM は動かさない。** YouTube 自身がチャットを移動させるため、拡張が DOM を動かすと衝突する。レイアウトは CSS の上書きと `position: fixed` だけで実現する。
2. **CSS は YouTube のセレクタを直接書かない。** JS が役割ごとのセレクタで要素を探して目印の属性 `data-ytcl-<役割>` を付け、視聴ページの状態属性を `<html>` の `ytcl-s-<状態>` class に写す。CSS はこの目印と class だけを対象にする。
3. **YouTube 依存部分を集約し、ユーザーが直せるようにする。** 役割の既定セレクタと状態属性名は `src/shared/selectors.ts` に集約する。セレクタは設定画面（要素ピッカー付き）で上書きでき、YouTube 内部の CSS 変数などへの依存はカスタム CSS で補えるようにする（3.7、3.8）。
4. **レイアウトを変えたら `resize` イベントを発火する。** プレイヤーに動画サイズを再計算させる。
5. **設定は 1 つだけ。** チャンネルや表示モード（通常 / シアター）ごとに設定を分けず、どこでも同じレイアウトになるようにする。

---

## 3. 機能仕様

### 3.1 レイアウトプリセット

| ID | 名前 | 通常 | シアター / 全画面 |
|---|---|---|---|
| `default` | 標準 | YouTube のまま | YouTube のまま |
| `swap` | チャット左 | `#columns` の並びを逆にする | プレイヤーとチャットの左右を入れ替える |
| `above-comments` | コメントの上 | 概要欄の下・コメント欄の上にチャットを置く | シアター: 同左。右端の固定チャットをやめ、プレイヤーを全幅にする。全画面: チャットを見えなくし、プレイヤーを全幅にする |
| `above-related` | 関連動画の上 | 関連動画の列の先頭にチャットを置く（高さを指定可） | 同上 |
| `overlay` | オーバーレイ | チャットを浮かべ、右カラムは関連動画のみ | チャットを動画の上に浮かべ、プレイヤーを全幅に戻す |

- 「チャット非表示」はプリセットではなく、YouTube 標準の開閉ボタンを使う（iframe が空になり、負荷も止まるため）。ショートカットキーとポップアップから操作する。
- チャットが閉じているときは、オーバーレイや差し込み枠のスタイルを適用しない。
- 全画面時は下段（概要欄・コメント・関連動画）が非表示になり置き場所がないため、「コメントの上」「関連動画の上」ではチャットを見えなくする。ただし**チャットは閉じない**。ニコニコ風表示など、チャット欄を読み取る他の拡張と併用できるよう、画面内に置いたまま `opacity: 0`・`pointer-events: none` にする（画面外への移動や `display: none` は、描画の間引きやチャットの更新停止を招くおそれがあるため避ける）。

### 3.2 コメントの上 / 関連動画の上

- JS が空の枠 `#ytcl-chat-slot` を目的の位置に差し込む。
  - コメントの上: `ytd-watch-metadata`（タイトル・概要欄）を含むボックスの直後。ライブ配信でコメント欄が無い場合も概要欄の下に置く
  - 関連動画の上: `#secondary-inner > #related` の直前
- チャット本体の DOM は動かさず、**CSS Anchor Positioning**（`anchor-name` / `position-anchor` / `anchor()` / `anchor-size()`）で枠に重ねる。概要欄の展開などで枠の位置が変わっても CSS だけで追従する。そのため Chrome 125 以上が必要（`minimum_chrome_version`）。
- `#secondary` は `position: relative` のため、そのままだと別カラムにある枠を anchor にできない。これらのプリセットでは `static` にする。
- YouTube 既定の `min-height: 596px`（通常レイアウト時）を打ち消す。
- 枠の幅は置いた列の幅に従い、高さは設定値（px）。
- 枠を置けないとき（対象要素が無いなど）は `ytcl-slot-ready` を付けず、チャットを動かさない。
- 枠の位置は、SPA 遷移・`ytd-watch-flexy` の属性変化・設定変更のたびに確認し直す。

### 3.3 オーバーレイ

- 位置とサイズはビューポートに対する **%（vw / vh）** で保存する。ウィンドウサイズや全画面の切り替えに追従する。
- チャット上端の**移動バー**（高さ 14px）をドラッグして移動する。**ダブルクリックで初期位置に戻す**。
- 右下の**グリップ**をドラッグしてリサイズする。最小サイズは幅 10%・高さ 15%。画面外にはみ出さないよう補正する。
- ドラッグ中はチャット iframe の `pointer-events` を切り、ポインタを奪われないようにする。
- 保存はドラッグ終了時だけ行う（`storage.sync` の書き込み回数制限への対策）。
- チャット iframe 内は、背景を半透明（不透明度は設定可）、文字を白＋縁取りにする。

### 3.4 チャットの見た目（全プリセット共通）

| 設定 | 内容 |
|---|---|
| チャット幅 | 横並び時の幅（px）。0 = YouTube 既定。`--ytd-watch-flexy-sidebar-width` を上書きする（右カラム全体の幅になる） |
| チャットの高さ | 「コメントの上」「関連動画の上」での高さ（px、200〜1200） |
| 文字サイズ | 70〜200%。メッセージ一覧に `zoom` を掛ける |
| ヘッダーを隠す | `yt-live-chat-header-renderer` |
| 入力欄を隠す | `#input-panel` / `#panel-pages` |
| ティッカーを隠す | `#ticker`（スーパーチャットの帯） |

### 3.5 ショートカットキー（`chrome.commands`。`chrome://extensions/shortcuts` で変更可能）

| 既定のキー | 動作 |
|---|---|
| Alt+Shift+L | プリセットを順に切り替える |
| Alt+Shift+C | チャットの表示 / 非表示 |

### 3.6 設定の保存

`chrome.storage.sync` のキー `settings` に 1 オブジェクトとして保存する（型は `src/shared/settings.ts` の `Settings`。セレクタの上書きも含む）。カスタム CSS は `storage.sync` の 1 項目 8KB 制限を避けるため `chrome.storage.local` のキー `customCss` に保存する（他の PC とは同期されない）。ポップアップ・設定画面・視聴ページ・チャット iframe は `storage.onChanged` で同期する。

### 3.7 セレクタの上書きと要素ピッカー

YouTube の DOM 変更でセレクタが合わなくなったときに、ユーザーが自分で直せるようにする。

- 役割（`src/shared/selectors.ts` の `ROLES`）ごとに既定セレクタを持ち、設定画面（オプションページ）で上書きできる。空欄・既定と同じ値は「上書きなし」として扱う。
  - 視聴ページ: 視聴ページ / 下段の列 / 右の列 / シアター時の上段 / シアター時のチャット領域 / チャット / チャット開閉ボタン / 概要欄 / 関連動画
  - チャット欄（iframe 内）: チャット本体 / ヘッダー / メッセージ一覧 / 入力欄 / ティッカー
- 設定画面は、最後に使った YouTube 視聴ページのタブにメッセージを送り、各セレクタの**一致数**を表示する。1 要素だけに一致すべき役割で複数に一致したら注意表示にする。
- 「ページから選ぶ」で、そのタブ上で**要素ピッカー**を起動する（uBlock Origin の要素ピッカーと同様）。
  - マウスを乗せた要素をハイライトし、クリックで選ぶ。クリックなどは YouTube に渡さない。
  - 選んだ要素から、セレクタの候補を一致数付きで並べる（現在値・既定値、`#id`、カスタム要素名・id を持つ祖先からのパス、class など）。
  - 「親要素へ」で選択をさかのぼれる。セレクタは直接編集でき、一致する要素をハイライトする。
  - チャット欄の役割はチャット iframe の中から選ぶ（同一オリジンなのでトップフレームから直接扱う）。
  - UI は Shadow DOM に閉じ込め、パネルでのキー入力を YouTube のショートカットに渡さない。Esc でキャンセル。
  - 決定すると設定に保存し、設定画面に戻る。
- セレクタが不正、または一致しない場合は、その役割を使う機能だけが働かない（YouTube 標準の表示のまま）。

### 3.8 カスタム CSS

- 設定画面で「視聴ページ用」「チャット欄用」の CSS を入力できる。拡張が有効のときだけ `<style id="ytcl-custom-css">` として差し込む。
- 目印の属性（`[data-ytcl-chat]` など）や `<html>` の class（`.ytcl-s-theater` など）も使える。
- YouTube 内部の CSS 変数・プロパティが変わったときの応急処置に使う。

---

## 4. アーキテクチャ

```
static/manifest.json
├─ content.js + content.css   … youtube.com 全体（live_chat 系を除く）。document_start
│    src/content/main.ts      … 設定の反映、目印付け、状態の転記、resize の発火
│    src/content/overlay.ts   … 移動バー・リサイズグリップ
│    src/content/slot.ts      … コメント/関連動画の上に置く差し込み枠
│    src/content/picker.ts    … 要素ピッカー（candidates.ts: セレクタ候補の生成）
├─ chat.js + chat.css         … /live_chat, /live_chat_replay（all_frames）
│    src/chat/main.ts         … iframe 内の目印付けと見た目調整
├─ background.js              … ショートカットキーの処理
│    src/background.ts
├─ popup.html + popup.js      … 設定 UI
│    src/popup/popup.ts
└─ options.html + options.js  … 詳細設定（セレクタ・カスタム CSS）
     src/options/options.ts
src/shared/
├─ settings.ts                … 設定・カスタム CSS の型・既定値・読み書き
├─ selectors.ts               … 役割と既定セレクタ、状態属性名（YouTube 依存）
├─ marker.ts                  … 役割の要素探索と目印付け、DOM 監視
├─ custom-css.ts              … カスタム CSS の差し込み
└─ messages.ts                … タブ・設定画面間のメッセージ型
```

- ビルド: esbuild で各エントリを IIFE に束ね、`static/` と一緒に `dist/` へ出力する。
- 目印付け: DOM の追加・削除を MutationObserver で監視し、間引いて（視聴ページ 150ms、チャット iframe 500ms）役割の要素を探し直す。SPA 遷移や YouTube の再描画で要素が入れ替わっても追従する。目印は属性の変更なので監視に反応せず、ループしない。
- 状態: 「視聴ページ」役割の要素の状態属性（`STATE_ATTRS`）を `attributeFilter` 付きの MutationObserver で監視し、`<html>` に写す。
- `<html>` に付ける class:
  - `ytcl-preset-<id>`（`default` 以外）
  - `ytcl-s-chat-open` / `ytcl-s-theater` / `ytcl-s-fullscreen` / `ytcl-s-fixed-panels` / `ytcl-s-squeezeback`
  - `ytcl-slot-ready`
  - `ytcl-chat-width`
  - `ytcl-dragging`
- 権限: `storage`、`host_permissions: https://www.youtube.com/*`（設定画面から YouTube タブを探して一致数を問い合わせるため）。
- CSS 変数: `--ytcl-chat-width`, `--ytcl-chat-height`, `--ytcl-ov-x/y/w/h`（視聴ページ）、`--ytcl-bg-alpha`, `--ytcl-font-scale`（チャット iframe）

---

## 5. ロードマップ

チャンネルごと・表示モードごとの設定は、方針 5 により行わない。

### 検討中
- オーバーレイの角への吸着（スナップ）
- `ytd-watch-grid` レイアウトへの対応
- 通常動画向けのプリセット（関連動画を隠してプレイヤーを最大化）

---

## 6. 既知の制約とリスク

| 内容 | 対策 |
|---|---|
| YouTube の DOM 変更で効かなくなる | セレクタを設定画面・要素ピッカーで直せる。要素が見つからなければ何もしない（標準レイアウトのまま） |
| YouTube 内部の CSS 変数・状態属性の変更 | 状態属性は `selectors.ts` の修正が必要。CSS 変数などはカスタム CSS で応急処置できる |
| 全画面時の「コメントの上」「関連動画の上」は実機で要確認 | シアター時と同じ仕組み（チャット領域の幅 0）でプレイヤーを全幅にし、チャットは透明化する |
| ニコニコ風コメント表示などの他の拡張との CSS 競合 | class・ID・CSS 変数に `ytcl-` 接頭辞を付ける |
| 右下のリサイズグリップがチャット入力欄の送信ボタンと重なることがある | 必要ならグリップを枠の外に出す |
| `zoom` による文字拡大でスクロール位置がずれる可能性 | 問題があればフォントサイズ用の CSS 変数で対応する方式に切り替える |
