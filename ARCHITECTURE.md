# ARCHITECTURE.md — slidein

## モノレポ構成

```
slidein/
├── apps/
│   ├── worker/          # Cloudflare Workers API (Hono)
│   └── web/             # Next.js 15 管理画面 (Cloudflare Pages)
├── packages/
│   ├── db/              # D1 スキーマ・マイグレーション・クエリ
│   ├── sdk/             # TypeScript SDK（外部利用者向け）
│   ├── meta-sdk/        # Meta Graph API ラッパー
│   └── shared/          # 共有型定義・ユーティリティ
├── docs/                # ドキュメント
├── scripts/             # ビルド・デプロイ・セットアップスクリプト
└── .github/workflows/   # CI/CD
```

## ドメイン構成

```
messaging/       ← DM送受信・Webhook処理
scenarios/       ← シナリオ（ステップDM・条件分岐）
contacts/        ← コンタクト管理・タグ・セグメント
triggers/        ← コメントトリガー・キーワード応答
analytics/       ← 配信分析・コンバージョン追跡
ai/              ← AI自動応答（Claude/OpenAI連携、オプション）
providers/       ← プラットフォーム別アダプター
  instagram/     ← Phase 1
  messenger/     ← Phase 2
  whatsapp/      ← Phase 3
shared/          ← 全ドメイン共通
```

## レイヤー構造（依存方向）

各ドメイン内は以下のレイヤーに分割。依存は左→右方向のみ許可。

```
Types → Config → Repository → Service → Handler
```

| レイヤー | 責務 | 例 |
|---|---|---|
| Types | データ型・Zodスキーマ | `Contact`, `Scenario`, `Message` |
| Config | 設定値・定数 | レート制限値、Meta APIエンドポイント |
| Repository | D1 CRUD操作 | `ContactRepository`, `ScenarioRepository` |
| Service | ビジネスロジック | `ScenarioExecutor`, `MessageRouter` |
| Handler | HTTPハンドラ・Webhook | Hono ルート、Cron ハンドラ |

### 禁止ルール
- ❌ Handler → Repository の直接アクセス（必ず Service 経由）
- ❌ 循環依存
- ❌ shared/ から個別ドメインへの依存
- ❌ packages/ から apps/ への依存

## データフロー

```
[Instagram] ──Webhook──→ [Worker: Handler]
                              │
                              ▼
                         [Service層]
                         ├── MessageRouter（キーワードマッチ）
                         ├── ScenarioExecutor（ステップDM進行）
                         └── AIResponder（オプション）
                              │
                              ▼
                         [Repository層]
                              │
                              ▼
                         [Cloudflare D1]

[Cron Trigger] ──5min──→ [Worker: Cron Handler]
                              │
                              ▼
                         [ScenarioExecutor]
                         └── 時刻ベースのステップ配信実行
```

## 横断的関心事

| 関心事 | 実装 |
|---|---|
| 認証 | Meta Webhook署名検証 / 管理画面はセッショントークン |
| レート制限 | TokenBucket（D1に状態保存、200通/時間を遵守） |
| ロギング | 構造化ログ（JSON）→ Workers Analytics Engine |
| エラーハンドリング | 境界でZodバリデーション / Resultパターン |
| キューイング | D1ベースのジョブキュー（外部依存なし） |

## 制約の強制方法

| 制約 | 強制手段 |
|---|---|
| 依存方向 | ESLint import ルール（no-restricted-imports） |
| ファイルサイズ | CI チェック（300行超で警告） |
| 型安全 | TypeScript strict mode |
| バリデーション | 境界で Zod 必須（custom ESLint rule） |
| コミット | Conventional Commits（commitlint） |

## インフラコスト

| リソース | 無料枠 | 5,000コンタクト時 |
|---|---|---|
| Workers | 10万req/日 | 無料枠内 |
| D1 | 5MB / 5万行読取/日 | 無料枠内 |
| Pages | 無制限帯域 | 無料 |
| **合計** | | **$0/月** |
