# Chrome Web Store への公開手順

初回の登録は Developer Dashboard から手作業で行い、2 回目以降は GitHub Actions でタグを push するだけで公開申請まで自動で行えます。

## 1. 開発者アカウントの登録（初回のみ）

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) に Google アカウントでログインする
2. 開発者登録料（1 回のみ、5 USD）を支払う
3. アカウント設定で次を済ませる
   - 連絡先メールアドレスの確認
   - Google アカウントの 2 段階認証（公開に必須）
   - 「トレーダー / 非トレーダー」の申告（EU 向け。個人の無償配布なら通常は非トレーダー）

## 2. 初回のアップロード（手作業）

1. タグを付けて GitHub Release の zip を作るか、手元で作る

   ```bash
   npm run build
   ```

   `dist/` の**中身**を zip にまとめる（`dist` フォルダごとではなく、`manifest.json` が zip の直下に来るようにする）。

2. Dashboard で「新しいアイテム」→ zip をアップロード
3. 各タブを入力する

   | タブ | 内容 |
   |---|---|
   | ストアの掲載情報 | 説明文・カテゴリ・画像。草案と画像は [store/LISTING.md](../store/LISTING.md) と `store/screenshots/` を参照 |
   | プライバシーへの取り組み | 下記「プライバシー欄の記入例」を参照 |
   | 配布 | 公開 / 限定公開（URL を知っている人だけ）、配布地域 |

4. 「審査のため送信」。審査は通常数日かかる
5. 公開後、Dashboard に表示される**アイテム ID**（32 文字の英字）を控えておく（自動公開の設定で使う）

### プライバシー欄の記入例

- **単一用途の説明**: YouTube の視聴ページで、ライブチャットの表示位置やレイアウトを変更します。
- **権限が必要な理由**
  - `storage`: レイアウトの設定、セレクタの上書き、カスタム CSS を保存するため
  - ホスト権限（`https://www.youtube.com/*`）: YouTube の視聴ページとライブチャット欄のレイアウトを変更するため。また、設定画面から開いている YouTube のタブを探し、セレクタの一致数を確認するため
- **リモートコードの使用**: いいえ
- **データの使用**: 収集するユーザーデータはなし（設定はブラウザ内の `chrome.storage` にのみ保存し、外部には送信しない）。データの使用に関する宣言にチェックを入れる

> 名前に「YouTube」を含めると、公式と誤認されるおそれがあるとして審査で指摘される場合があります。指摘を受けたら「〜 for YouTube」のように、非公式であることが分かる名前にしてください。

## 3. GitHub Actions での自動公開（2 回目以降）

`.github/workflows/release.yml` は、`v1.2.3` 形式のタグを push すると次を行います。

1. 型チェックとビルド
2. タグと `manifest.json` のバージョンが一致するか確認
3. zip を作り、GitHub Release に添付
4. Chrome Web Store の Secrets が登録されていれば、ストアにアップロードして公開申請（審査を通ると公開される）

### 3.1 API の認証情報を用意する（初回のみ）

[chrome-webstore-upload-keys のガイド](https://github.com/fregante/chrome-webstore-upload-keys) に沿って進めます。概要は次のとおりです。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作り、**Chrome Web Store API** を有効にする
2. OAuth 同意画面を作る（ユーザーの種類: 外部）
3. OAuth クライアント ID を作り、**クライアント ID** と**クライアントシークレット**を控える
4. ガイドの手順で**リフレッシュトークン**を取得する

> OAuth 同意画面の公開ステータスが「テスト」のままだと、リフレッシュトークンが 7 日で失効し、自動公開が失敗するようになります。「本番環境」に切り替えておいてください（個人利用なら Google の確認審査は不要です）。

### 3.2 GitHub の Secrets に登録する

リポジトリの Settings → Secrets and variables → Actions → New repository secret で、次の 5 つを登録します。

| Secret 名 | 値 |
|---|---|
| `CWS_EXTENSION_ID` | アイテム ID |
| `CWS_PUBLISHER_ID` | パブリッシャー ID（Dashboard のアカウント設定に表示される） |
| `CWS_CLIENT_ID` | OAuth クライアント ID |
| `CWS_CLIENT_SECRET` | OAuth クライアントシークレット |
| `CWS_REFRESH_TOKEN` | リフレッシュトークン |

Secrets が未登録の間は、ストアへのアップロードだけがスキップされます（GitHub Release は作られます）。

### 3.3 リリースの手順

```bash
npm version patch
```

`package.json` と `static/manifest.json` のバージョンが上がり、コミットとタグ（例: `v0.3.1`）が作られます。機能追加なら `minor`、大きな変更なら `major` を指定してください。

```bash
git push --follow-tags
```

タグが push されると Actions が動き、GitHub Release の作成とストアへの公開申請まで行います。進み具合はリポジトリの Actions タブで確認できます。
