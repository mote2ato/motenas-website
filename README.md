# motenas-website

株式会社もてなす（https://motenas.co.jp）のコーポレートサイトです。
[EmDash](https://github.com/emdash-cms/emdash)（Astro製のCMS）で作り、Cloudflare Workers（D1 + R2）で動かします。

## ページ

| URL | 内容 | 編集する場所（管理画面） |
|---|---|---|
| `/` | トップ | 事業内容・お知らせ・ブログの一覧は自動で反映 |
| `/about` | 会社案内 | 固定ページ「about」 |
| `/service` | 事業内容 | 固定ページ「service」＋「事業内容」コレクション |
| `/access` | アクセス | 固定ページ「access」 |
| `/contact` | お問い合わせ（フォーム） | 固定ページ「contact」 |
| `/news` | お知らせ | 「お知らせ」コレクション |
| `/blog` | ブログ（カテゴリー別一覧あり） | 「ブログ」コレクション |
| `/rss.xml` | お知らせ＋ブログのRSS | — |

管理画面は `/_emdash/admin` です。固定ページは、ほかにスラッグを付けて作れば `/{スラッグ}` で公開されます。

## 開発

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

初回はローカルのDBが空なので、次のURLを開くと初期データ入りで管理者としてログインできます（開発時のみ）。
http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin

```bash
pnpm test       # お問い合わせフォームの単体テスト
pnpm typecheck  # 型チェック
pnpm build      # 本番ビルド
pnpm run deploy # Cloudflareへ公開
pnpm seed       # scripts/build-seed.py から seed/seed.json を作り直す
```

## 公開とドメイン移行

[docs/MIGRATION.md](docs/MIGRATION.md) を参照してください（**メールを止めないための手順を含みます**）。

## デザイン

[docs/DESIGN.md](docs/DESIGN.md) のスタイル（黒地・白文字・細い罫線・全面のアートワーク）に沿っています。
共通スタイルは `src/styles/global.css` にあります。
