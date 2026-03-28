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

→ Full setup guide: [docs/specs/setup-guide.md](docs/specs/setup-guide.md)

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

## 📄 License

MIT © [molt-oss](https://github.com/molt-oss)

## 🤝 Contributing

Issues & PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

*Inspired by [LINE Harness](https://github.com/Shudesu/line-harness-oss) — the project that proved SaaS tools can be replaced with zero-cost, AI-native OSS.*
