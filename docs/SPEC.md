# YT Custom Layouts 仕様書

YouTube の生配信・アーカイブ視聴ページで、ライブチャットの位置やサイズを自由に変え、動画の表示領域を広げる Chrome 拡張 (Manifest V3)。

- 最終更新: 2026-10-04（v0.2.0）
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
2. **状態の判定は `ytd-watch-flexy` の属性に任せる。** CSS は属性セレクタで直接書き、JS は「チャットが開いているか」だけを `<html>` に写す。
3. **YouTube 依存部分を集約する。** セレクタ・属性名は `src/shared/selectors.ts`、上書き CSS は `static/content.css` に集約する。
4. **レイアウトを変えたら `resize` イベントを発火する。** プレイヤーに動画サイズを再計算させる。
5. **設定は 1 つだけ。** チャンネルや表示モード（通常 / シアター）ごとに設定を分けず、どこでも同じレイアウトになるようにする。

---

## 3. 機能仕様

### 3.1 レイアウトプリセット

| ID | 名前 | 通常 | シアター / 全画面 |
|---|---|---|---|
| `default` | 標準 | YouTube のまま | YouTube のまま |
| `swap` | チャット左 | `#columns` の並びを逆にする | プレイヤーとチャットの左右を入れ替える |
| `above-comments` | コメントの上 | 概要欄の下・コメント欄の上にチャットを置く | 同左。右端の固定チャットをやめ、プレイヤーを全幅にする |
| `above-related` | 関連動画の上 | 関連動画の列の先頭にチャットを置く（高さを指定可） | 同左。右端の固定チャットをやめ、プレイヤーを全幅にする |
| `overlay` | オーバーレイ | チャットを浮かべ、右カラムは関連動画のみ | チャットを動画の上に浮かべ、プレイヤーを全幅に戻す |

- 「チャット非表示」はプリセットではなく、YouTube 標準の開閉ボタンを使う（iframe が空になり、負荷も止まるため）。ショートカットキーとポップアップから操作する。
- チャットが閉じているときは、オーバーレイや差し込み枠のスタイルを適用しない。
- 全画面時は下段（概要欄・コメント・関連動画）が非表示になるため、「コメントの上」「関連動画の上」は YouTube 既定の横並び表示になる。

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

`chrome.storage.sync` のキー `settings` に 1 オブジェクトとして保存する（型は `src/shared/settings.ts` の `Settings`）。ポップアップ・視聴ページ・チャット iframe は `storage.onChanged` で同期する。

---

## 4. アーキテクチャ

```
static/manifest.json
├─ content.js + content.css   … youtube.com 全体（live_chat 系を除く）。document_start
│    src/content/main.ts      … 設定の反映、ytd-watch-flexy の監視、resize の発火
│    src/content/overlay.ts   … 移動バー・リサイズグリップ
│    src/content/slot.ts      … コメント/関連動画の上に置く差し込み枠
├─ chat.js + chat.css         … /live_chat, /live_chat_replay（all_frames）
│    src/chat/main.ts         … iframe 内の見た目調整
├─ background.js              … ショートカットキーの処理
│    src/background.ts
└─ popup.html + popup.js      … 設定 UI
     src/popup/popup.ts
src/shared/
├─ settings.ts                … 設定の型・既定値・読み書き
├─ selectors.ts               … YouTube 依存のセレクタ・属性名
└─ messages.ts                … タブへ送るメッセージ型
```

- ビルド: esbuild で各エントリを IIFE に束ね、`static/` と一緒に `dist/` へ出力する。
- SPA 遷移: `yt-navigate-finish` で `ytd-watch-flexy` を取り直し、MutationObserver（`attributeFilter` 指定）を付け直す。
- `<html>` に付ける class:
  - `ytcl-preset-<id>`（`default` 以外）
  - `ytcl-slot-ready`
  - `ytcl-chat-width`
  - `ytcl-chat-open`
  - `ytcl-dragging`
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
| YouTube の DOM・CSS 変更で効かなくなる | 依存部分を `selectors.ts` と `content.css` に集約する。要素が見つからなければ何もしない（標準レイアウトのまま） |
| 全画面時の左右入れ替えは実機で未検証 | シアター時と同じ `#full-bleed-container` の並び替えで効く想定。実機で確認する |
| ニコニコ風コメント表示などの他の拡張との CSS 競合 | class・ID・CSS 変数に `ytcl-` 接頭辞を付ける |
| 右下のリサイズグリップがチャット入力欄の送信ボタンと重なることがある | 必要ならグリップを枠の外に出す |
| `zoom` による文字拡大でスクロール位置がずれる可能性 | 問題があればフォントサイズ用の CSS 変数で対応する方式に切り替える |
