import { AccountRepository } from "./repository.js";
import type { Account, AccountCredentials, CreateAccountInput, UpdateAccountInput } from "./types.js";
import type { Env } from "../config/env.js";

function maskSecret(value: string): string {
  if (!value || value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export class AccountService {
  private readonly repo: AccountRepository;

  constructor(private readonly db: D1Database) {
    this.repo = new AccountRepository(db);
  }

  async listAll(maskTokens = false): Promise<Account[]> {
    const accounts = await this.repo.findAll();
    if (!maskTokens) return accounts;
    return accounts.map((account) => ({
      ...account,
      metaAccessToken: maskSecret(account.metaAccessToken),
      metaAppSecret: maskSecret(account.metaAppSecret),
    }));
  }

  async create(input: CreateAccountInput): Promise<Account> { return this.repo.create(input); }
  async update(id: string, input: UpdateAccountInput): Promise<Account | null> { return this.repo.update(id, input); }
  async delete(id: string): Promise<boolean> { return this.repo.delete(id); }
  async findById(id: string): Promise<Account | null> { return this.repo.findById(id); }
  async findByIgAccountId(igAccountId: string): Promise<Account | null> { return this.repo.findByIgAccountId(igAccountId); }

  async resolveCredentials(accountId: string, env: Env): Promise<AccountCredentials> {
    if (accountId !== 'default') {
      const account = await this.repo.findById(accountId);
      if (account && account.enabled) {
        return {
          accountId: account.id,
          igAccountId: account.igAccountId,
          accessToken: account.metaAccessToken,
          appSecret: account.metaAppSecret,
        };
      }
    }

    return {
      accountId: 'default',
      igAccountId: env.IG_ACCOUNT_ID,
      accessToken: env.META_ACCESS_TOKEN,
      appSecret: env.META_APP_SECRET,
    };
  }

  async resolveByRecipientIgAccountId(recipientIgAccountId: string | undefined, env: Env): Promise<AccountCredentials> {
    if (recipientIgAccountId) {
      const account = await this.repo.findByIgAccountId(recipientIgAccountId);
      if (account && account.enabled) {
        return {
          accountId: account.id,
          igAccountId: account.igAccountId,
          accessToken: account.metaAccessToken,
          appSecret: account.metaAppSecret,
        };
      }
    }
    return this.resolveCredentials('default', env);
  }
}
