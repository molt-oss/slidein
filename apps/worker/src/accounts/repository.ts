import type { Account, CreateAccountInput, UpdateAccountInput } from "./types.js";

interface AccountRow {
  id: string;
  name: string;
  ig_account_id: string;
  ig_username: string | null;
  meta_access_token: string;
  meta_app_secret: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    igAccountId: row.ig_account_id,
    igUsername: row.ig_username,
    metaAccessToken: row.meta_access_token,
    metaAppSecret: row.meta_app_secret,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AccountRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<Account[]> {
    const result = await this.db.prepare("SELECT * FROM accounts ORDER BY created_at DESC").all<AccountRow>();
    return result.results.map(rowToAccount);
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.db.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first<AccountRow>();
    return row ? rowToAccount(row) : null;
  }

  async findByIgAccountId(igAccountId: string): Promise<Account | null> {
    const row = await this.db.prepare("SELECT * FROM accounts WHERE ig_account_id = ?").bind(igAccountId).first<AccountRow>();
    return row ? rowToAccount(row) : null;
  }

  async create(input: CreateAccountInput): Promise<Account> {
    const row = await this.db.prepare(`INSERT INTO accounts (name, ig_account_id, ig_username, meta_access_token, meta_app_secret, enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now')) RETURNING *`).bind(input.name, input.igAccountId, input.igUsername ?? null, input.metaAccessToken, input.metaAppSecret, input.enabled === false ? 0 : 1).first<AccountRow>();
    if (!row) throw new Error("Failed to create account");
    return rowToAccount(row);
  }

  async update(id: string, input: UpdateAccountInput): Promise<Account | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const row = await this.db.prepare(`UPDATE accounts SET name = ?, ig_account_id = ?, ig_username = ?, meta_access_token = ?, meta_app_secret = ?, enabled = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`).bind(input.name ?? current.name, input.igAccountId ?? current.igAccountId, input.igUsername ?? current.igUsername, input.metaAccessToken ?? current.metaAccessToken, input.metaAppSecret ?? current.metaAppSecret, input.enabled === undefined ? (current.enabled ? 1 : 0) : input.enabled ? 1 : 0, id).first<AccountRow>();
    return row ? rowToAccount(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (id === 'default') throw new Error('default account cannot be deleted');
    const result = await this.db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }
}
