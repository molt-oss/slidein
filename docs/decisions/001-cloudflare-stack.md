# ADR-001: Cloudflare Workers + D1 をインフラとして採用

## ステータス
承認

## コンテキスト
Instagram DM 自動化ツールをOSSとして配布する。利用者が月額0円で運用できるインフラが必要。

## 決定
Cloudflare Workers + D1 + Pages をフルスタックとして採用する。

## 理由
- **無料枠が十分**: Workers 10万req/日、D1 5MB、Pages無制限帯域
- **5,000コンタクトまで完全無料**で運用可能
- **サーバーレス**: 利用者がサーバー管理不要
- **`wrangler deploy` 一発**: デプロイが簡単
- **LINE Harness で実証済み**: 同じ構成で成功事例あり
- **グローバルエッジ**: Webhook応答が高速

### 検討した代替案
- **Vercel + Supabase**: Vercel無料枠の制限が厳しい（100GB帯域/月）
- **AWS Lambda + DynamoDB**: 無料枠はあるがセットアップが複雑
- **Docker セルフホスト**: VPS費用が発生、非技術者に敷居が高い

## 影響
- ポジティブ: 利用者のコストが0円、デプロイが簡単
- ネガティブ: Cloudflare固有のAPI・制約に依存（D1はSQLite互換だが完全ではない）
