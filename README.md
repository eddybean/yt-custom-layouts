# YT Custom Layouts

YouTube の生配信・アーカイブで、ライブチャットの位置やサイズを自由に変える Chrome 拡張です。

- **標準** … YouTube のまま（チャット幅だけ変更可）
- **チャット左** … チャットとプレイヤーの左右を入れ替え
- **オーバーレイ** … チャットを半透明にして動画の上に浮かべ、ドラッグで移動・リサイズ

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
| `src/content/` | 視聴ページ用。設定の反映、状態の監視、オーバーレイの操作 |
| `src/chat/` | チャット iframe 用。透過・文字サイズ・要素の非表示 |
| `src/popup/` | ポップアップの設定 UI |
| `src/background.ts` | ショートカットキーの処理 |
| `src/shared/` | 設定・セレクタ・メッセージ型 |
| `static/` | manifest・CSS・HTML（ビルド時に `dist/` へコピー） |

YouTube の仕様変更で効かなくなったときは、まず `src/shared/selectors.ts` と `static/content.css` を確認してください。
