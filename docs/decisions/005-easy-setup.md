# ADR-005: ワンコマンドセットアップ（npx create-slidein）

## ステータス
承認

## コンテキスト
OSSとして配布する以上、初心者が簡単にデプロイできることが採用の鍵。
現状はD1作成・マイグレーション・シークレット設定を手動で行う必要があり、ハードルが高い。

## 決定
`npx create-slidein` コマンドで対話形式のセットアップを提供する。

### フロー
```
$ npx create-slidein

🛝 slidein セットアップ

? Cloudflare にログインします (wrangler login を実行)
  → ブラウザが開く → ログイン

? Meta App Secret を入力: ********
? Meta Access Token を入力: ********
? 管理API用パスワード (自動生成する場合はEnter): 
  → 空Enterで32文字ランダム生成

✅ D1 データベース作成完了
✅ マイグレーション実行完了 (6テーブル)
✅ シークレット設定完了 (wrangler secret)
✅ デプロイ完了！

🛝 あなたの slidein: https://slidein.xxx.workers.dev
📋 次のステップ:
   1. Meta Developer Console で Webhook URL を設定:
      https://slidein.xxx.workers.dev/webhook
   2. Verify Token: (表示)
   3. 管理画面: https://slidein.xxx.workers.dev (別途デプロイ)
```

### セキュリティ
- シークレットは全て `wrangler secret put` 経由（Cloudflare暗号化ストレージ）
- `.env` ファイルにシークレットを書かない（gitに残るリスクゼロ）
- ADMIN_API_KEY は crypto.randomUUID() + crypto.getRandomValues() で生成
- セットアップスクリプト自体にはシークレットを保持しない（全てwranglerに委任）

### 技術実装
- `packages/create-slidein/` にCLIパッケージを新規作成
- 依存: prompts（対話UI）, chalk（色付き出力）, execa（wrangler実行）
- npm に `create-slidein` として公開 → `npx create-slidein` で即実行

## 理由
- LINE Harness は `wrangler deploy` 一発だが、その前の設定が初心者には難しい
- ManyChat は SaaS なのでデプロイ不要 → OSSでこの体験に近づけるには自動化が必須
- `npx create-xxx` は Next.js (create-next-app) 等で馴染みのあるパターン

## 影響
- ポジティブ: 初心者の導入ハードルが大幅に下がる
- ポジティブ: READMEの Quick Start が1コマンドになる
- ネガティブ: npm パッケージの公開・メンテナンスが必要
