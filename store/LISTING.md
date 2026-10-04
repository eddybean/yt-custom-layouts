# Chrome Web Store 掲載情報（草案）

Developer Dashboard の「ストアの掲載情報」に入力する内容の草案です。日本語を既定の言語とし、必要なら英語の掲載情報も追加してください。

## 基本情報

| 項目 | 内容 |
|---|---|
| 名前 | YT Custom Layouts（manifest の `name`） |
| カテゴリ | Chrome をカスタマイズ › 機能と UI（Make Chrome Yours › Functionality & UI） |
| 言語 | 日本語 |
| ホームページ URL | https://github.com/eddybean/yt-custom-layouts |
| サポート URL | https://github.com/eddybean/yt-custom-layouts/issues |

> 名前について: 「YouTube」や「YT」を含む名前は、公式と誤認されるとして審査で指摘される場合があります。指摘を受けた場合の代案: 「Live Chat Layouts for YouTube」「チャット配置カスタマイザー for YouTube」

## 概要（manifest の `description`。132 文字以内）

**日本語（70 文字）**

```
YouTube のライブ配信・アーカイブで、チャット欄を関連動画の上・コメントの上・動画の上などに配置。動画を大きく、見やすいレイアウトに。
```

**英語（130 文字）**

```
Move YouTube live chat where you want it: above related videos, above comments, or floating over the video. Keep the player large.
```

## 説明（日本語）

```
YouTube のライブ配信やアーカイブ（チャットのリプレイ）で、チャット欄の位置を変えられる拡張機能です。
標準のレイアウトではチャットが動画の右側を占めますが、配置を変えることで動画を大きく表示したり、自分好みの見やすいレイアウトにしたりできます。

■ 5 種類のレイアウト
・標準：YouTube のまま（チャットの幅だけ調整できます）
・チャット左：チャットと動画の左右を入れ替えます
・コメントの上：概要欄の下にチャットを置きます。右の列は関連動画だけになります
・関連動画の上：右の列の先頭にチャットを置きます。シアターモードでも動画が画面幅いっぱいになります
・オーバーレイ：チャットを半透明にして動画の上に重ねます。位置とサイズはドラッグで自由に変えられます

レイアウトの設定は 1 つだけで、通常表示・シアターモードのどちらでも同じ配置になります。

■ チャットの見た目
・チャットの幅・高さ
・文字サイズ
・オーバーレイ時の背景の濃さ
・ヘッダー、入力欄、スーパーチャットのティッカーの非表示

■ ショートカットキー
・Alt+Shift+L：レイアウトを順に切り替え
・Alt+Shift+C：チャットの表示/非表示
（chrome://extensions/shortcuts で変更できます）

■ YouTube の変更にも自分で追従
YouTube の画面構成が変わってレイアウトが効かなくなった場合は、詳細設定から各要素のセレクタを変更できます。
uBlock Origin の要素ピッカーのように、ページ上の要素をクリックして選ぶこともできます。
カスタム CSS を追加して、見た目を細かく調整することもできます。

■ 全画面表示について
「コメントの上」「関連動画の上」では、全画面表示中はチャットを見えなくして動画を最大化します。
チャット自体は閉じないため、チャットを読み取る他の拡張機能と併用できます。

■ プライバシー
設定はブラウザ内にのみ保存し、外部には一切送信しません。ユーザーデータの収集も行いません。

■ 動作環境
Chrome 125 以降

■ ソースコード（MIT ライセンス）
https://github.com/eddybean/yt-custom-layouts

※ 本拡張機能は YouTube および Google LLC とは関係のない、非公式の拡張機能です。
```

## Description (English)

```
Move the YouTube live chat to where you want it, on live streams and on archived streams with chat replay.
By default, the chat takes up the right side of the player. Rearrange it to make the video larger and the page easier to read.

■ 5 layouts
- Default: YouTube as is (only the chat width can be adjusted)
- Chat left: swap the chat and the player
- Above comments: place the chat below the description, leaving only related videos in the right column
- Above related videos: place the chat at the top of the right column; even in theater mode the player spans the full width
- Overlay: float a semi-transparent chat over the video, and drag to move or resize it

There is only one layout setting, and it applies to both the default and theater modes.

■ Chat appearance
- Chat width and height
- Font size
- Background opacity in overlay mode
- Hide the header, the input box, or the Super Chat ticker

■ Keyboard shortcuts
- Alt+Shift+L: cycle through layouts
- Alt+Shift+C: show or hide the chat
(Change them at chrome://extensions/shortcuts)

■ Keep up with YouTube changes yourself
If a YouTube update breaks the layout, you can change the selector for each element in the advanced settings.
Like the uBlock Origin element picker, you can also pick elements by clicking them on the page.
You can add custom CSS for further tweaks.

■ Fullscreen
With "Above comments" and "Above related videos", the chat is hidden while in fullscreen so the video fills the screen.
The chat itself stays open, so it keeps working with other extensions that read the chat.

■ Privacy
Settings are stored only in your browser and are never sent anywhere. No user data is collected.

■ Requirements
Chrome 125 or later

■ Source code (MIT License)
https://github.com/eddybean/yt-custom-layouts

This is an unofficial extension and is not affiliated with YouTube or Google LLC.
```

## 画像

`npm run shots` で `store/screenshots/` に生成します（ダミーページを headless Chrome で撮影）。

- 動画部分は黒塗り、チャット・タイトル・チャンネル名・コメント・関連動画はすべてダミー
- YouTube のロゴやサムネイルなど、第三者の素材は使っていません
- 4 枚目のポップアップは、ビルド済みの実際の画面を埋め込んでいます

| ファイル | 用途 | サイズ |
|---|---|---|
| `1-overlay.png` | スクリーンショット 1（オーバーレイ） | 1280×800 |
| `2-above-related.png` | スクリーンショット 2（関連動画の上・シアターモード） | 1280×800 |
| `3-above-comments.png` | スクリーンショット 3（コメントの上） | 1280×800 |
| `4-settings.png` | スクリーンショット 4（ポップアップの設定） | 1280×800 |
| `5-picker.png` | スクリーンショット 5（要素ピッカー） | 1280×800 |
| `promo-small.png` | プロモーション用タイル（小） | 440×280 |
| `static/icons/icon128.png` | ストアアイコン | 128×128 |

スクリーンショットの見出しや配置を変えるときは `store/shots/*.html` を編集してから `npm run shots` を実行してください。
