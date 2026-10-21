# 公開・ドメイン移行の手順書

株式会社もてなす（motenas.co.jp）のサイトを、さくらインターネットのWordPressから
Cloudflare Workers上のEmDashへ移すための手順です。上から順に進めてください。

> **最重要：メールを止めないこと。** 現在のメール設定は「MX = motenas.co.jp 自身」で、
> motenas.co.jp のAレコードがさくらのサーバー（112.78.125.115）を指しています。
> サイトをCloudflareへ向けるとこのAレコードが変わるため、**手順4を飛ばすとメールが届かなくなります。**

## 2026-10-21 時点のDNS（調査結果）

| 名前 | 種類 | 値 |
|---|---|---|
| motenas.co.jp | NS | ns1.dns.ne.jp / ns2.dns.ne.jp（さくらのDNS） |
| motenas.co.jp | A | 112.78.125.115（さくらのサーバー www655b.sakura.ne.jp） |
| motenas.co.jp | MX | 10 motenas.co.jp |
| motenas.co.jp | TXT | `v=spf1 a:www655b.sakura.ne.jp mx include:_spf.google.com ~all` |
| motenas.co.jp | TXT | `google-site-verification=55CZffQggLfkdXoEtmlfjIolYamgOjJObt3K6lJNkMo` |
| www.motenas.co.jp | — | レコードなし |

切り替え前に、さくらのコントロールパネルで**ほかのレコード（サブドメインなど）がないか**必ず確認してください。

---

## 1. Cloudflareの準備

1. Cloudflareアカウントを作成（またはログイン）。
2. **Workers Paid プラン（月額5ドル）に加入**します。
   EmDashの本体が大きく、圧縮後約5.1MBあるため、無料プランの上限（3MB）を超えます。

## 2. 仮URLで公開する（ドメインはまだ触らない）

```bash
pnpm install
npx wrangler login
pnpm run deploy
```

- 初回デプロイで、D1データベース `motenas-website` とR2バケット `motenas-website-media` が自動で作られます。
- 表示された `https://motenas-website.<アカウント>.workers.dev` を開き、`/_emdash/admin` で**初期設定ウィザード**を進めます。
  - **「サンプルコンテンツを含める（Include sample content）」をオンにしてください。** 会社案内・事業内容・アクセス・お問い合わせ・お知らせの初期データが入ります。
  - 管理者アカウントはパスキーで登録します。**パスキーはドメインごとに紐づく**ため、本番ドメインへ移ったあとで登録し直します（手順6）。

## 3. お問い合わせフォームのメール送信（Resend）

フォームの送信内容は、Resend経由で info@motenas.co.jp に届きます。

1. [Resend](https://resend.com) に登録し、Domains で `motenas.co.jp` を追加。
2. 表示されたDNSレコード（`resend._domainkey` のTXT、`send` のMX/TXT）を控えておきます。
   **ルートのMXは変更しないので、さくらのメールと共存できます。** 追加はDNSをCloudflareへ移したあと（手順5）に行うのが簡単です。
3. APIキーを作成し、Workerに登録:

```bash
npx wrangler secret put RESEND_API_KEY
```

送信先・送信元は `wrangler.jsonc` の `CONTACT_TO` / `CONTACT_FROM` で変えられます。

### 迷惑送信対策（任意・推奨）

標準で「人間には見えない入力欄」と「表示から3秒以内の送信を弾く」対策が入っています。
さらに強くしたい場合は Cloudflare Turnstile を使います。

1. Cloudflareダッシュボード → Turnstile でサイトを追加（ホスト名 motenas.co.jp と workers.dev）。
2. サイトキーを `wrangler.jsonc` の `TURNSTILE_SITE_KEY` に記入。
3. `npx wrangler secret put TURNSTILE_SECRET_KEY` でシークレットキーを登録し、再デプロイ。

## 4. メールの受け口を、サイトから切り離す（DNS移行の前に必須）

いまはMXが `motenas.co.jp` を指しているので、MXの宛先を別の名前に変えます。
**さくらのDNSのまま、次の2つを行ってください。**

1. MXレコードを `10 www655b.sakura.ne.jp.` に変更する
   （さくらのサーバーの初期ドメインです。サーバー名はさくらのコントロールパネルで確認してください）。
2. メールソフト（Outlook、iPhoneのメール、Gmailの外部アカウント取り込みなど）の
   受信・送信サーバー名が `motenas.co.jp` になっている場合は、**`www655b.sakura.ne.jp` に変更する**。
   サイトのAレコードが変わると、`motenas.co.jp` ではさくらのメールサーバーにつながらなくなります。

変更後、数時間〜1日おいて、メールの送受信ができることを確認します。

## 5. ネームサーバーをCloudflareへ移す

1. Cloudflareダッシュボード → 「サイトを追加」で `motenas.co.jp` を追加（Freeプランで可）。
2. 自動で読み込まれたDNSレコードを確認し、次の状態にそろえます。

| 名前 | 種類 | 値 | プロキシ |
|---|---|---|---|
| motenas.co.jp | MX | 10 www655b.sakura.ne.jp | — |
| motenas.co.jp | TXT | `v=spf1 a:www655b.sakura.ne.jp mx include:_spf.google.com ~all`（現状のまま） | — |
| motenas.co.jp | TXT | `google-site-verification=…`（現状のまま） | — |
| Resendが指定したレコード | TXT/MX | 手順3で控えた値 | DNSのみ |

   ※ ResendのSPFは送信用サブドメイン（`send.motenas.co.jp`）側に入るので、ルートのSPFは変更不要です。
   ※ ルートの `A 112.78.125.115` は、次の手順でWorkerに切り替えるので削除してかまいません。
   ほかにさくら側で使っているサブドメインがあれば、**「DNSのみ（灰色の雲）」**で残してください。

3. さくらインターネットの会員メニューで、motenas.co.jp のネームサーバーを、Cloudflareが指定する2つに変更します。
4. Cloudflare上で「有効」になるまで待ちます（数分〜最大48時間）。

## 6. 本番ドメインをWorkerに割り当てる

1. `wrangler.jsonc` の `routes` のコメントを外す:

```jsonc
"routes": [
	{ "pattern": "motenas.co.jp", "custom_domain": true },
	{ "pattern": "www.motenas.co.jp", "custom_domain": true },
],
```

2. 本番URLを環境変数で指定（パスキー、ログイン、サイトマップに使われます）:

```bash
npx wrangler secret put EMDASH_SITE_URL   # 値: https://motenas.co.jp
```

3. `pnpm run deploy` で再デプロイ。
4. `https://motenas.co.jp/_emdash/admin` でパスキーを登録し直します。
5. www付きでアクセスされた場合は、Cloudflareの「リダイレクトルール」で `www.motenas.co.jp/*` → `https://motenas.co.jp/$1`（301）を設定します。

## 7. 公開後の確認

- [ ] トップ・会社案内・事業内容・アクセス・お問い合わせ・お知らせ・ブログが表示される
- [ ] 旧URL（`/about/` `/service/` `/access/` `/contact/`）がそのまま開ける
- [ ] `/hello-world/` `/sample-page/` `/renewal/` がトップまたはブログへ転送される
- [ ] お問い合わせフォームから送信し、info@motenas.co.jp に届く。返信すると送信者宛てになる
- [ ] info@motenas.co.jp の送受信ができる（外部のGmailなどから送って確認）
- [ ] Google Search Console でサイトマップ（`/sitemap.xml`）を送信し直す

## 8. 旧サーバーの扱い

メールをさくらで使い続ける限り、**さくらのレンタルサーバー契約は解約しないでください。**
WordPress本体は、切り替え後しばらく様子を見てから、さくらのコントロールパネルで削除してかまいません
（削除前にバックアップを取っておくと安心です）。
