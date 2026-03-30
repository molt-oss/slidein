import { describe, expect, it } from "vitest";
import { AccountService } from "../accounts/service.js";
import { createGenericD1Mock } from "./helpers/d1-mock.js";

const env = {
  DB: {} as D1Database,
  IG_ACCOUNT_ID: "default-ig",
  META_ACCESS_TOKEN: "default-token",
  META_APP_SECRET: "default-secret",
} as const;

describe("AccountService", () => {
  it("resolveCredentials は有効なアカウントの認証情報を返す", async () => {
    const db = createGenericD1Mock([
      {
        __table: "accounts",
        id: "acc-1",
        name: "Account 1",
        ig_account_id: "ig-1",
        ig_username: "ig1",
        meta_access_token: "token-1",
        meta_app_secret: "secret-1",
        enabled: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const service = new AccountService(db);
    const credentials = await service.resolveCredentials("acc-1", env as never);

    expect(credentials).toEqual({
      accountId: "acc-1",
      igAccountId: "ig-1",
      accessToken: "token-1",
      appSecret: "secret-1",
    });
  });

  it("resolveCredentials は見つからないアカウントで default にフォールバックする", async () => {
    const service = new AccountService(createGenericD1Mock());
    const credentials = await service.resolveCredentials("missing", env as never);

    expect(credentials).toEqual({
      accountId: "default",
      igAccountId: "default-ig",
      accessToken: "default-token",
      appSecret: "default-secret",
    });
  });

  it("resolveByRecipientIgAccountId は recipient の IG account id から解決する", async () => {
    const db = createGenericD1Mock([
      {
        __table: "accounts",
        id: "acc-2",
        name: "Account 2",
        ig_account_id: "ig-recipient",
        ig_username: "ig2",
        meta_access_token: "token-2",
        meta_app_secret: "secret-2",
        enabled: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const service = new AccountService(db);
    const credentials = await service.resolveByRecipientIgAccountId("ig-recipient", env as never);

    expect(credentials.accountId).toBe("acc-2");
    expect(credentials.accessToken).toBe("token-2");
    expect(credentials.appSecret).toBe("secret-2");
  });
});
