/**
 * MCP (Model Context Protocol) 型定義
 */
import { z } from "zod";

/** JSON-RPC 2.0 リクエスト */
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;

/** JSON-RPC 2.0 レスポンス */
export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** MCP ツール定義 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
