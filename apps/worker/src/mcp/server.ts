/**
 * MCP Server — HTTP経由のModel Context Protocol実装
 *
 * JSON-RPC 2.0 over HTTP で MCP プロトコルを処理する。
 * Claude Code 等のAIエージェントから全機能を操作可能にする。
 *
 * MF-2: scope パラメータで read / readwrite の権限分離を実装
 */
import { structuredLog } from "@slidein/shared";
import { MCPRequestSchema, type MCPResponse } from "./types.js";
import {
  getToolDefinitions,
  createToolHandlers,
  isWriteTool,
  type MCPScope,
} from "./tools.js";

interface MCPServerDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
  aiApiKey?: string;
}

export class MCPServer {
  private readonly handlers: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown>
  >;

  /** 現在のスコープ。initialize で設定される。デフォルトは readwrite */
  private scope: MCPScope = "readwrite";

  constructor(deps: MCPServerDeps) {
    this.handlers = createToolHandlers(deps);
  }

  async handleRequest(body: unknown): Promise<MCPResponse> {
    const parseResult = MCPRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return {
        jsonrpc: "2.0",
        id: 0,
        error: { code: -32600, message: "Invalid Request" },
      };
    }

    const { id, method, params } = parseResult.data;

    try {
      switch (method) {
        case "initialize":
          return this.handleInitialize(id, params);
        case "tools/list":
          return this.handleToolsList(id);
        case "tools/call":
          return await this.handleToolsCall(id, params ?? {});
        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (error) {
      structuredLog("error", "MCP request failed", {
        method,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      };
    }
  }

  private handleInitialize(
    id: string | number,
    params?: Record<string, unknown>,
  ): MCPResponse {
    // scope パラメータでread/readwrite権限を指定可能
    const requestedScope = params?.scope as string | undefined;
    if (requestedScope === "read" || requestedScope === "readwrite") {
      this.scope = requestedScope;
    }

    structuredLog("info", "MCP initialized", { scope: this.scope });

    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: "slidein",
          version: "0.1.0",
        },
        scope: this.scope,
      },
    };
  }

  private handleToolsList(id: string | number): MCPResponse {
    return {
      jsonrpc: "2.0",
      id,
      result: { tools: getToolDefinitions(this.scope) },
    };
  }

  private async handleToolsCall(
    id: string | number,
    params: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const toolName = params.name as string;
    const toolArgs = (params.arguments as Record<string, unknown>) ?? {};

    // MF-2: read scope では write 系ツールへのアクセスを拒否
    if (this.scope === "read" && isWriteTool(toolName)) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: `Tool "${toolName}" requires "readwrite" scope. Current scope: "read"`,
        },
      };
    }

    const handler = this.handlers[toolName];
    if (!handler) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown tool: ${toolName}` },
      };
    }

    const result = await handler(toolArgs);

    structuredLog("info", "MCP tool called", { tool: toolName, scope: this.scope });

    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      },
    };
  }
}
