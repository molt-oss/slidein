# セットアップガイド — slidein

## 必要なもの

| 項目 | 必須 | 費用 |
|---|---|---|
| Cloudflare アカウント | ✅ | 無料 |
| Node.js 20+ & pnpm | ✅ | 無料 |
| Meta Developer アカウント | ✅ | 無料（Facebookアカウント必要） |
| Instagram ビジネス/クリエイターアカウント | ✅ | 無料（個人アカウントから切替可） |
| Facebook ページ | ✅ | 無料（IGビジネスアカウントに紐付け必要） |
| Claude / OpenAI API キー | オプション | 従量課金（AI自動応答を使う場合のみ） |

## クイックスタート（推奨）

```bash
npx create-slidein
```

対話形式で全ての設定が完了します。詳細は下記の手動セットアップを参照。

## 手動セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/molt-oss/slidein.git
cd slidein
pnpm install
```

### 2. Cloudflare の設定

```bash
# Cloudflare にログイン
npx wrangler login

# D1 データベース作成
npx wrangler d1 create slidein-db
# → 出力される database_id をメモ
```

`apps/worker/wrangler.toml` の `database_id` を書き換え:
```toml
[[d1_databases]]
binding = "DB"
database_name = "slidein-db"
database_id = "ここに貼り付け"
```

### 3. データベースのマイグレーション

```bash
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0001_initial_schema.sql
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0002_pending_messages.sql
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0003_scenarios.sql
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0004_broadcasts_scoring_automations.sql
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0005_tracking_webhooks_conversions_forms_delivery.sql
npx wrangler d1 execute slidein-db --file=packages/db/migrations/0006_ai_config.sql
```

### 4. Meta Developer App の作成

1. https://developers.facebook.com/ にログイン
2. 「マイアプリ」→「アプリを作成」
3. 種類:「ビジネス」を選択
4. アプリ名: 任意（例: "My slidein"）
5. 作成後、左メニューから「Instagram」→「設定」
6. 以下をメモ:
   - **App Secret** (アプリの設定 → ベーシック)
   - **Access Token** (Instagram → API設定 → トークン生成)

### 5. シークレットの設定

```bash
# Meta の認証情報
npx wrangler secret put META_APP_SECRET
# → App Secret を入力

npx wrangler secret put META_ACCESS_TOKEN
# → Access Token を入力

# 管理API認証用（自分で決める。長くてランダムな文字列を推奨）
npx wrangler secret put ADMIN_API_KEY

# Webhook検証用トークン（自分で決める）
npx wrangler secret put WEBHOOK_VERIFY_TOKEN

# AI自動応答を使う場合（オプション）
npx wrangler secret put AI_API_KEY
```

### 6. デプロイ

```bash
cd apps/worker
npx wrangler deploy
# → https://slidein.{your-subdomain}.workers.dev
```

### 7. Webhook の設定

1. Meta Developer Console → Instagram → Webhooks
2. コールバック URL: `https://slidein.{your-subdomain}.workers.dev/webhook`
3. Verify Token: ステップ5で設定した `WEBHOOK_VERIFY_TOKEN`
4. 購読するフィールド: `messages`, `messaging_postbacks`（コメントDMも使う場合は `comments`）
5. 「検証して保存」→ ✅ が表示されればOK

### 8. 動作確認

```bash
# API疎通確認
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://slidein.{your-subdomain}.workers.dev/api/contacts

# → [] (空の配列が返ればOK)
```

Instagram で自分のアカウントにDMを送り、Webhook が正常に動作することを確認。

## 管理画面のデプロイ（オプション）

```bash
cd apps/web
cp .env.local.example .env.local
# API_URL=https://slidein.{your-subdomain}.workers.dev
# API_KEY=YOUR_ADMIN_API_KEY
# を設定

pnpm build
# Cloudflare Pages にデプロイ or Vercel 等
```

## MCP接続（Claude Code から操作）

Claude Code の MCP 設定に追加:
```json
{
  "mcpServers": {
    "slidein": {
      "url": "https://slidein.{your-subdomain}.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ADMIN_API_KEY"
      }
    }
  }
}
```

## トラブルシューティング

| 症状 | 原因 | 対策 |
|---|---|---|
| Webhook検証失敗 | WEBHOOK_VERIFY_TOKEN不一致 | wrangler secret put で再設定 |
| DM返信されない | Access Tokenの権限不足 | Meta ConsoleでInstagram Messaging権限を確認 |
| 403 Forbidden (API) | ADMIN_API_KEY不一致 | AuthorizationヘッダのBearer tokenを確認 |
| D1エラー | マイグレーション未実行 | 0001〜0006を順番に実行 |
