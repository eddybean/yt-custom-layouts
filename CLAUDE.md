# CLAUDE.md

YouTube の生配信・アーカイブ視聴ページで、ライブチャットの位置やレイアウトを変える Chrome 拡張（Manifest V3）。
仕様と YouTube 側の調査結果は [docs/SPEC.md](docs/SPEC.md)、公開手順は [docs/PUBLISHING.md](docs/PUBLISHING.md)、ストア掲載情報は [store/LISTING.md](store/LISTING.md)。

## コマンド

```bash
npm run build      # esbuild で src/ を束ね、static/ と一緒に dist/ へ出力
npm run watch      # 変更を監視して再ビルド
npm run typecheck  # tsc --noEmit（TypeScript 7）
npm run shots      # ストア用スクリーンショットを store/screenshots/ に生成（ローカルの Chrome を使用）
```

テストフレームワークはない。変更後は最低限 `npm run typecheck` と `npm run build` を通す。

## 構成

- `src/content/` … 視聴ページ用コンテンツスクリプト（`main.ts`: 設定反映・目印付け・状態転記、`slot.ts`: 差し込み枠、`overlay.ts`: ドラッグ操作、`picker.ts` / `candidates.ts`: 要素ピッカー）
- `src/chat/` … チャット iframe（`/live_chat`, `/live_chat_replay`、`all_frames`）用
- `src/popup/`, `src/options/`, `src/background.ts` … ポップアップ、詳細設定、ショートカットキー
- `src/shared/` … 設定 (`settings.ts`)、YouTube 依存の定義 (`selectors.ts`)、目印付け (`marker.ts`)、メッセージ型
- `static/` … manifest・CSS・HTML・アイコン（ビルド時に `dist/` へコピー）。レイアウトの本体は `static/content.css` と `static/chat.css`

## 設計の原則（必ず守る）

- **DOM を動かさない。** YouTube 自身が表示モードに応じてチャットを移動させるため、レイアウトは CSS の上書き・`position: fixed`・CSS Anchor Positioning だけで実現する。
- **CSS に YouTube のセレクタを書かない。** JS が `ROLES`（`src/shared/selectors.ts`）のセレクタで要素を探して `data-ytcl-<役割>` を付け、状態属性（`STATE_ATTRS`）を `<html>` の `ytcl-s-<状態>` class に写す。CSS はこの目印と `ytcl-*` class だけを対象にする。新しい要素を扱うときは、まず `ROLES` に役割を追加する。
- YouTube 依存は `selectors.ts`（セレクタ・状態属性名）と CSS 内の YouTube 内部 CSS 変数（`--ytd-*`, `--yt-live-chat-*`）に限定する。
- 要素が見つからない・セレクタが不正なときは何もしない（YouTube 標準の表示のままにする）。
- class・ID・CSS 変数・属性には `ytcl-` 接頭辞を付ける（他の拡張との衝突回避）。
- YouTube は Trusted Types を強制しているので `innerHTML` は使わず DOM API で組み立てる。

## ユーザーの要望・決定事項

- チャンネルごと・表示モードごとに設定を分けない。設定は 1 つで、どこでも同じレイアウトにする。
- 全画面時、チャットは閉じたり `display: none` にしたりしない。ユーザーは別の拡張（ニコニコ風表示）でチャット欄を読み取っているため、見えなくする場合も画面内に置いたまま `opacity: 0` にする。
- コード中のコメント、ドキュメント、コミットメッセージ、UI の文言は日本語。
- ストア用画像は著作権に配慮し、実際の YouTube ページではなく `store/shots/` のダミーページから作る（動画は黒塗り、文字はダミー、ロゴ不使用）。

## 動作確認

- 実機確認は、ユーザーが Chrome に `dist/` を読み込んで行う。
- 自分で確かめるときは、内蔵ブラウザで YouTube の視聴ページ（チャットリプレイ付きのアーカイブが確実）を開き、ビルド結果を JavaScript として注入する。`chrome.*` API はスタブに差し替える。YouTube の Trusted Types により `new Function` / `eval` は拒否されることがあるので、コードは直接貼り付ける。
- 内蔵ブラウザでは全画面表示にできない。全画面の確認はユーザーに依頼するか、Claude in Chrome を使う。
- 表示モードを切り替えて確認する（通常・シアター・全画面、ライブ・アーカイブ）。シアターは `.ytp-size-button` をクリックすると切り替わる。

## Git・リリース

- リリースは `npm version patch|minor|major` → `git push --follow-tags`。`version` スクリプトが `static/manifest.json` のバージョンを同期し、タグの push で `.github/workflows/release.yml` が GitHub Release の作成と Chrome Web Store への公開申請を行う。
