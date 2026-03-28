# ADR-002: Phase 1 のスコープ定義

## ステータス
承認

## コンテキスト
slidein の最初の実装フェーズ。Instagram DM 自動化の最小限の動作単位を定義する。

## 決定
Phase 1 は以下の4機能に絞る:

1. **Meta Webhook 受信** — Instagram DM着信をCloudflare Workerで受信・署名検証
2. **キーワード応答** — 受信メッセージのキーワードマッチ → 自動返信
3. **コメント → DM トリガー** — 投稿コメントを検知 → DMで自動返信
4. **コンタクト管理** — D1にコンタクト情報を保存・タグ付け

## 理由
- Webhook受信が全機能の基盤。ここが動かないと何も始まらない
- キーワード応答は最もシンプルなユースケースで、E2Eの動作確認に最適
- コメント→DMはManyChatの最も使われている機能
- コンタクト管理はシナリオ配信（Phase 2）の前提

### Phase 1 に含めないもの
- シナリオ配信（ステップDM）→ Phase 2
- 管理画面UI → Phase 2
- AI自動応答 → Phase 3
- MCP対応 → Phase 3

## 影響
- Phase 1完了時点で「wrangler deployしてWebhook設定すれば動く」状態になる
- CLIまたはAPIでキーワードルール・トリガーを設定する（UIはPhase 2）
