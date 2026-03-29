/**
 * AI Service — Claude/OpenAI API連携による自動応答
 *
 * fetchで直接API呼び出し（SDK不使用 — Workers互換性のため）
 */
import { structuredLog } from "@slidein/shared";
import { AIConfigRepository } from "./repository.js";
import type { AIConfig, UpdateAIConfigInput } from "./types.js";
import type { Contact } from "../contacts/types.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface AIServiceDeps {
  db: D1Database;
  aiApiKey?: string;
}

export class AIService {
  private readonly repo: AIConfigRepository;
  private readonly aiApiKey: string | undefined;

  constructor(deps: AIServiceDeps) {
    this.repo = new AIConfigRepository(deps.db);
    this.aiApiKey = deps.aiApiKey;
  }

  async getConfig(): Promise<AIConfig | null> {
    return this.repo.get();
  }

  async updateConfig(input: UpdateAIConfigInput): Promise<AIConfig> {
    const config = await this.repo.update(input);
    structuredLog("info", "AI config updated", { enabled: config.enabled });
    return config;
  }

  /** メッセージに対するAI応答を生成 */
  async generateResponse(
    message: string,
    contact: Contact,
    config: AIConfig,
  ): Promise<string | null> {
    const apiKey = this.resolveApiKey(config);
    if (!apiKey) {
      structuredLog("warn", "AI API key not configured");
      return null;
    }

    const systemPrompt = this.buildSystemPrompt(config, contact);

    try {
      if (config.provider === "anthropic") {
        return await this.callAnthropic(
          apiKey, config.model, systemPrompt, message, config.maxTokens,
        );
      }
      return await this.callOpenAI(
        apiKey, config.model, systemPrompt, message, config.maxTokens,
      );
    } catch (error) {
      structuredLog("error", "AI API call failed", {
        provider: config.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private resolveApiKey(config: AIConfig): string | undefined {
    // 環境変数を優先、DBのキーはマルチテナント用フォールバック
    return this.aiApiKey ?? config.apiKeyEncrypted ?? undefined;
  }

  private buildSystemPrompt(config: AIConfig, contact: Contact): string {
    const parts: string[] = [];

    if (config.systemPrompt) {
      parts.push(config.systemPrompt);
    } else {
      parts.push(
        "You are a helpful assistant for an Instagram business account. " +
        "Reply concisely and naturally in the same language as the user.",
      );
    }

    // コンタクト情報を注入
    parts.push(
      `\n\n--- Contact Info ---\n` +
      `Name: ${contact.displayName ?? contact.username ?? "Unknown"}\n` +
      `Tags: ${contact.tags.length > 0 ? contact.tags.join(", ") : "none"}\n` +
      `Score: ${contact.score}`,
    );

    if (config.knowledgeBase) {
      parts.push(
        `\n\n--- Knowledge Base ---\n${config.knowledgeBase}`,
      );
    }

    return parts.join("");
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens: number,
  ): Promise<string | null> {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const textBlock = data.content.find((b) => b.type === "text");
    return textBlock?.text ?? null;
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens: number,
  ): Promise<string | null> {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? null;
  }
}
