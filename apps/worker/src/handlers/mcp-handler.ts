/**
 * MCP Handler — MCPエンドポイント (Bearer token 認証)
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { MCPServer } from "../mcp/server.js";
import { bearerAuth } from "../middleware/auth.js";
import { getAccountIdFromRequest } from "../accounts/http.js";

const mcpHandler = new Hono<{ Bindings: Env }>();

mcpHandler.use("/mcp", bearerAuth());

mcpHandler.post("/mcp", async (c) => {
  const body = await c.req.json();

  const server = new MCPServer({
    db: c.env.DB,
    accessToken: c.env.META_ACCESS_TOKEN,
    igAccountId: c.env.IG_ACCOUNT_ID,
    aiApiKey: c.env.AI_API_KEY,
    accountId: getAccountIdFromRequest(c),
  });

  const response = await server.handleRequest(body);

  structuredLog("info", "MCP request processed", {
    method: body?.method,
  });

  return c.json(response);
});

export { mcpHandler };
