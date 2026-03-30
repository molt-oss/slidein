# ADR-004: Multi-Account Support

## Status
Accepted — 2026-03-30

## Context
slidein currently supports only one Instagram account per Worker deployment.
For agencies and marketers managing multiple Instagram accounts, this means deploying separate Workers for each account — which defeats the cost advantage.

The goal is to support N Instagram accounts in a single Worker + D1 deployment.

## Decision
**Approach A: `account_id` column on all tables.**

### New Table: `accounts`

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  ig_account_id TEXT NOT NULL UNIQUE,
  ig_username TEXT,
  meta_access_token TEXT NOT NULL,
  meta_app_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tables that need `account_id`

All existing data tables get a new `account_id TEXT NOT NULL REFERENCES accounts(id)` column:

1. `contacts` — remove UNIQUE on `ig_user_id`, add UNIQUE on `(account_id, ig_user_id)`
2. `keyword_rules`
3. `comment_triggers`
4. `messages`
5. `scenarios`
6. `scenario_steps` — inherits via `scenario_id`, no direct `account_id` needed
7. `scenario_enrollments` — inherits via `scenario_id`, no direct `account_id` needed
8. `broadcasts`
9. `scoring_rules`
10. `automation_rules`
11. `tracked_links`
12. `link_clicks` — inherits via `tracked_link_id`, no direct `account_id` needed
13. `delivery_settings`
14. `webhook_endpoints`
15. `conversion_goals`
16. `conversions` — inherits via `goal_id`, no direct `account_id` needed
17. `forms`
18. `form_responses` — inherits via `form_id`, no direct `account_id` needed
19. `rate_limit_tokens`
20. `ai_config`
21. `pending_messages` (if exists)

**Child tables** (scenario_steps, scenario_enrollments, link_clicks, conversions, form_responses) don't need `account_id` directly — they reference parent tables that already have it. Queries on these tables should JOIN through the parent.

### Migration Strategy

Since D1 doesn't support `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a default, and we don't want to set a fake default for `account_id`:

1. Create `accounts` table
2. Insert a `default` account row using the existing env credentials
3. Add `account_id` column with `DEFAULT 'default'` to all tables
4. Add indexes on `account_id` for all tables
5. Update unique constraints (e.g., contacts: `ig_user_id` → `(account_id, ig_user_id)`)

### Env Changes

Current env vars (`META_ACCESS_TOKEN`, `META_APP_SECRET`, `IG_ACCOUNT_ID`) become **fallback/default account credentials**. Per-account credentials are stored in the `accounts` table.

### Webhook Routing

Instagram webhooks include `recipient.id` (the IG account ID that received the message). Use this to look up which `account` the event belongs to:

```
POST /webhook → parse payload → entry[].messaging[].recipient.id → lookup account → route to correct service instance
```

### Repository Changes

Every repository constructor takes `accountId: string` parameter. Every query adds `WHERE account_id = ?`.

Example:
```typescript
class KeywordMatchService {
  constructor(private db: D1Database, private accountId: string) {}

  async findMatch(text: string) {
    // ... WHERE account_id = ? AND enabled = 1
  }
}
```

### API Changes

All API endpoints become account-scoped:
- Current: `GET /api/keyword-rules`
- New: `GET /api/keyword-rules` with `X-Account-Id` header or `?accountId=` query param
- New: `GET /api/accounts` — list all accounts
- New: `POST /api/accounts` — add a new account
- New: `PUT /api/accounts/:id` — update account
- New: `DELETE /api/accounts/:id` — delete account

### Dashboard Changes

- Account switcher in sidebar (dropdown or list)
- Account management page (add/edit/delete accounts)
- All data views scoped to selected account
- Selected account stored in cookie/localStorage

### MCP Changes

All MCP tools receive `accountId` as a required parameter.
New tools: `accounts_list`, `accounts_create`, `accounts_delete`.

## Implementation Order

1. Migration `0007_multi_account.sql`
2. `AccountRepository` + `AccountService`
3. Update `Env` type and webhook handler routing
4. Update all repositories to accept and filter by `accountId`
5. Update all services to pass `accountId`
6. Update all API handlers to read `accountId` from request
7. Account management API endpoints
8. Update MCP tools
9. Update dashboard (account switcher + management page)
10. Update setup script
11. Update tests
12. Update docs

## Consequences

- All existing deployments continue to work (default account with env credentials)
- Agencies can add unlimited accounts in one deployment
- Per-account token management is in D1 (not env vars) — tokens can be rotated via dashboard
- Slight query overhead from additional WHERE clause (negligible for D1)
