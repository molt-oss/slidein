/**
 * Account API Handler — マルチアカウント管理
 */
import { Hono } from "hono";
import { z } from "zod";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { AccountService } from "../accounts/service.js";
import { bearerAuth } from "../middleware/auth.js";

const accountApi = new Hono<{ Bindings: Env }>();

accountApi.use("/api/*", bearerAuth());

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  igAccountId: z.string().min(1),
  igUsername: z.string().min(1).optional().nullable(),
  metaAccessToken: z.string().min(1),
  metaAppSecret: z.string().min(1),
  enabled: z.boolean().optional(),
});

const UpdateAccountSchema = CreateAccountSchema.partial();

function createService(env: Env): AccountService {
  return new AccountService(env.DB);
}

function maskAccessToken(value: string): string {
  if (!value) return "****";
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

accountApi.get("/api/accounts", async (c) => {
  const service = createService(c.env);
  const accounts = await service.listAll();
  return c.json({
    data: accounts.map((account) => ({
      ...account,
      metaAccessToken: maskAccessToken(account.metaAccessToken),
    })),
  });
});

accountApi.post("/api/accounts", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateAccountSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const account = await service.create(parseResult.data);

  structuredLog("info", "Account created via API", { accountId: account.id });
  return c.json({ data: account }, 201);
});

accountApi.put("/api/accounts/:id", async (c) => {
  const body = await c.req.json();
  const parseResult = UpdateAccountSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const account = await service.update(c.req.param("id"), parseResult.data);

  if (!account) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Account updated via API", { accountId: account.id });
  return c.json({ data: account });
});

accountApi.delete("/api/accounts/:id", async (c) => {
  const service = createService(c.env);
  const deleted = await service.delete(c.req.param("id"));

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Account deleted via API", { accountId: c.req.param("id") });
  return c.json({ success: true });
});

export { accountApi };
