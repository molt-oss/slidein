# 🛝 slidein

**Open-source DM automation for Instagram, Messenger & more.**
**Slide into your customers' DMs — for $0/month.**

## 💸 How is it free?

slidein runs on [Cloudflare](https://www.cloudflare.com/) — a cloud platform used by millions of websites.
They offer a **generous free plan** that covers everything slidein needs:

| What slidein uses | What it is (in plain English) | Free plan limit | Enough for |
|---|---|---|---|
| **Workers** | A tiny server that runs your code | 100,000 requests/day | ~5,000 DMs/day |
| **D1** | A database that stores your contacts & rules | 5 GB storage | ~50,000 contacts |
| **Pages** | Hosting for the dashboard website | Unlimited bandwidth | ♾️ |

**You don't need to enter a credit card.** Cloudflare's free plan is truly free — no trial, no expiration.
For most Instagram creators with up to 5,000 followers, you'll never need to pay anything.

> 💡 For comparison: ManyChat charges $15–$300+/month for the same features, and the price goes up as your follower count grows. With slidein, it stays $0.

## ✨ Features

- 💬 **Comment → DM auto-reply** — Someone comments? They get a DM automatically
- 🔑 **Keyword replies** — DM "price" → auto-send your price list
- 📋 **Step DMs (scenarios)** — Send a series of DMs over days/weeks automatically
- 📢 **Broadcasts** — Send a message to all contacts (or filtered by tag)
- 📊 **Lead scoring** — Track who's most engaged
- ⚡ **Automation rules** — IF someone does X, THEN do Y (add tag, start scenario, send DM)
- 🔗 **Link tracking** — Short URLs with click analytics
- 📝 **Forms** — Collect info via DM conversation
- 📈 **Conversion tracking** — Measure what's working
- 🤖 **AI auto-reply (optional)** — Connect Claude or ChatGPT for natural conversations
- 🧠 **MCP support** — Control everything from Claude Code with natural language
- 🎨 **Dashboard** — Manage everything from a web interface

## 📱 Supported Platforms

| Platform | Status |
|---|---|
| 📸 Instagram | ✅ Ready |
| 💬 Facebook Messenger | 📋 Planned |
| 📱 WhatsApp | 📋 Planned |
| 🐦 X (Twitter) | 📋 Future |

## 🆚 Why slidein?

| | ManyChat | slidein |
|---|---|---|
| 💰 Monthly cost | $15–$300+ | **$0** |
| 📈 Price goes up with followers? | Yes | **Never** |
| 🤖 AI | Basic | **Claude/GPT native** |
| 🔓 Your data | On their servers | **On your own Cloudflare** |
| 🔌 API access | Limited | **Full access** |
| 📦 Source code | Closed | **Open (MIT)** |

## 🚀 Getting Started

### What you'll need (all free)

| Account | What it's for | Time to create |
|---|---|---|
| [Cloudflare](https://dash.cloudflare.com/sign-up) | Hosts your slidein (the server + database) | 2 min |
| [Meta Developer](https://developers.facebook.com/) | Connects to Instagram's DM system | 5 min |
| Instagram Business/Creator | Required by Instagram for DM automation | 1 min (switch from personal) |
| [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/) | Runs the setup tool on your computer | 5 min |

### Setup

```bash
git clone https://github.com/molt-oss/slidein.git
cd slidein
pnpm install
```

→ **Full step-by-step guide with screenshots:** [molt-oss.github.io/slidein](https://molt-oss.github.io/slidein/)
→ 🇯🇵 **日本語ガイド:** [molt-oss.github.io/slidein/ja/](https://molt-oss.github.io/slidein/ja/)

## 🔌 MCP (Model Context Protocol)

slidein exposes an MCP endpoint — AI agents like Claude Code can manage all features via natural language.

```
You: "Create a keyword rule that replies 'Check your DMs!' when someone says 'price'"
Claude: → calls keyword_rules_create({ keyword: "price", matchType: "contains", responseText: "Check your DMs!" })
```

→ [MCP setup guide](https://molt-oss.github.io/slidein/#mcp)

## 🗺️ Roadmap

- [x] Webhook + keyword auto-reply + comment DM triggers
- [x] Contact management with tags
- [x] Scenario builder (step DMs)
- [x] Dashboard UI
- [x] Broadcasts + lead scoring + automation rules
- [x] Link tracking + conversion tracking + forms
- [x] AI auto-reply (Claude/OpenAI)
- [x] MCP server (24 tools)
- [ ] One-command setup (`npx create-slidein`)
- [ ] Multi-platform support (Messenger, WhatsApp)

## 📄 License

MIT © [molt-oss](https://github.com/molt-oss)

## 🤝 Contributing

Issues & PRs welcome!

---

*Inspired by [LINE Harness](https://github.com/Shudesu/line-harness-oss) — the project that proved paid SaaS tools can be replaced with zero-cost, AI-native open source.*
