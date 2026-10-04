# YT Custom Layouts

YouTube の生配信・アーカイブで、ライブチャットの位置やサイズを自由に変える Chrome 拡張です。

- **標準** … YouTube のまま（チャット幅だけ変更可）
- **チャット左** … チャットとプレイヤーの左右を入れ替え
- **コメントの上** … 概要欄の下・コメント欄の上にチャットを置き、動画を広げる
- **関連動画の上** … 関連動画の列の先頭にチャットを置き、動画を広げる
- **オーバーレイ** … チャットを半透明にして動画の上に浮かべ、ドラッグで移動・リサイズ

Chrome 125 以上が必要です（CSS Anchor Positioning を使用）。

YouTube の変更でレイアウトが効かなくなったときは、ポップアップの「詳細設定」から、各要素のセレクタを変更したり（ページ上の要素をクリックして選ぶこともできます）、カスタム CSS を追加したりできます。

仕様と YouTube 側の調査結果は [docs/SPEC.md](docs/SPEC.md) を参照してください。

## 開発

```bash
npm install
npm run build      # dist/ に出力
npm run watch      # 変更を監視して再ビルド
npm run typecheck
```

### Chrome への読み込み

1. `chrome://extensions` を開き、右上の「デベロッパーモード」をオンにする
2. 「パッケージ化されていない拡張機能を読み込む」で `dist/` を選ぶ
3. コードを変更したら、拡張機能のカードの再読み込みボタンを押し、YouTube のタブも再読み込みする

### 構成

| パス | 内容 |
|---|---|
| `src/content/` | 視聴ページ用。設定の反映、状態の監視、差し込み枠、オーバーレイの操作 |
| `src/chat/` | チャット iframe 用。透過・文字サイズ・要素の非表示 |
| `src/popup/` | ポップアップの設定 UI |
| `src/options/` | 詳細設定（セレクタの上書き・カスタム CSS） |
| `src/background.ts` | ショートカットキーの処理 |
| `src/shared/` | 設定・セレクタ・メッセージ型 |
| `static/` | manifest・CSS・HTML（ビルド時に `dist/` へコピー） |

YouTube の仕様変更で効かなくなったときは、まず `src/shared/selectors.ts` と `static/content.css` を確認してください。

### リリース

```bash
npm version patch
git push --follow-tags
```

タグを push すると GitHub Actions がビルドし、GitHub Release の作成と Chrome Web Store への公開申請を行います。初回の登録と認証情報の設定は [docs/PUBLISHING.md](docs/PUBLISHING.md) を参照してください。

## ライセンス

[MIT](LICENSE)
