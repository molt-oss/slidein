# 🛝 slidein

**Open-source DM automation for Instagram, Messenger & more.**
**Slide into your customers' DMs — for $0/month.**

ManyChat に月額 $15〜$300 払ってない？ slidein なら、同じ機能が **月額 $0** で動く。

## ✨ Features

- 💬 **コメント → DM 自動返信** — 投稿へのコメントをトリガーにDM送信
- 🔑 **キーワード応答** — 特定キーワードに自動で返信
- 📋 **シナリオ配信（ステップDM）** — 時系列に沿った自動DM配信
- 🏷️ **タグ・セグメント管理** — コンタクトの分類・絞り込み
- 🤖 **AI 自動応答（オプション）** — Claude / OpenAI API 連携
- 📊 **分析ダッシュボード** — 配信数・返信率・コンバージョン
- 🧠 **MCP 対応** — Claude Code から全機能を自然言語で操作

## 📱 Supported Platforms

| Platform | Status |
|---|---|
| 📸 Instagram | 🚧 In Progress |
| 💬 Facebook Messenger | 📋 Planned |
| 📱 WhatsApp | 📋 Planned |
| 🐦 X (Twitter) | 📋 Future |

## 🏗️ Architecture

- **Cloudflare Workers** (Hono) — API & Webhook
- **Cloudflare D1** — Database (SQLite)
- **Cloudflare Pages** — Dashboard (Next.js 15)
- **Meta Graph API** — Instagram Messaging API

→ 5,000 contacts まで **完全無料**（Cloudflare 無料枠内）

## 🆚 Why slidein?

| | ManyChat | slidein |
|---|---|---|
| 💰 Monthly | $15〜$300+ | **$0** |
| 📈 Follower pricing | Yes (scales up) | **None** |
| 🤖 AI | Basic | **Claude/GPT native** |
| 🔓 Data ownership | Their servers | **Your Cloudflare D1** |
| 🔌 API | Limited | **Full access** |
| 📦 Source code | Closed | **MIT** |

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/molt-oss/slidein.git
cd slidein

# 2. Install
pnpm install

# 3. Setup (Meta App & Cloudflare config)
pnpm run setup

# 4. Deploy
pnpm --filter worker deploy
```

→ Full setup guide: [molt-oss.github.io/slidein](https://molt-oss.github.io/slidein/)

## 📋 Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Meta Developer account](https://developers.facebook.com/) (free)
- Instagram Business / Creator account
- Node.js 20+ & pnpm

## 🗺️ Roadmap

- [x] Project scaffold & architecture
- [ ] Meta Webhook receiver
- [ ] Keyword auto-reply
- [ ] Comment → DM trigger
- [ ] Contact management
- [ ] Scenario builder (step DMs)
- [ ] Dashboard UI
- [ ] AI auto-reply (Claude API)
- [ ] MCP server
- [ ] Multi-platform support (Messenger, WhatsApp)
- [ ] Template marketplace

## 🔌 MCP (Model Context Protocol)

slidein exposes an MCP endpoint that lets AI agents (Claude Code, etc.) manage all features via natural language.

### Setup

Add to your Claude Code MCP config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "slidein": {
      "type": "url",
      "url": "https://your-worker.your-subdomain.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ADMIN_API_KEY"
      }
    }
  }
}
```

### Available Tools

| Tool | Description |
|---|---|
| `contacts_list` / `contacts_get` | Contact management |
| `keyword_rules_list` / `_create` / `_delete` | Keyword auto-reply |
| `comment_triggers_list` / `_create` / `_delete` | Comment → DM triggers |
| `scenarios_list` / `_create` / `_delete` | Step DM scenarios |
| `broadcasts_list` / `_create` / `_send` | Broadcast messages |
| `scoring_rules_list` / `_create` | Lead scoring |
| `automations_list` / `_create` | IF-THEN automation |
| `tracked_links_list` / `_create` | URL tracking |
| `forms_list` / `_create` | DM forms |
| `ai_config_get` / `_update` | AI auto-reply config |

### Example

```
You: "Create a keyword rule that replies 'Check your DMs!' when someone says 'price'"
Claude: → calls keyword_rules_create({ keyword: "price", matchType: "contains", responseText: "Check your DMs!" })
```

## 📄 License

MIT © [molt-oss](https://github.com/molt-oss)

## 🤝 Contributing

Issues & PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

*Inspired by [LINE Harness](https://github.com/Shudesu/line-harness-oss) — the project that proved SaaS tools can be replaced with zero-cost, AI-native OSS.*
