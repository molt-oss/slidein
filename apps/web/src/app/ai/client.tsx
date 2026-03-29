"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { updateAIConfig, type AIConfig } from "@/lib/api";
import { useToast } from "@/components/toast";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
};

export function AIClient({
  initialConfig,
}: {
  initialConfig: AIConfig | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false);
  const [provider, setProvider] = useState<"anthropic" | "openai">(
    initialConfig?.provider ?? "anthropic",
  );
  const [model, setModel] = useState(
    initialConfig?.model ?? "claude-sonnet-4-20250514",
  );
  const [systemPrompt, setSystemPrompt] = useState(
    initialConfig?.systemPrompt ?? "",
  );
  const [knowledgeBase, setKnowledgeBase] = useState(
    initialConfig?.knowledgeBase ?? "",
  );
  const [maxTokens, setMaxTokens] = useState(
    initialConfig?.maxTokens ?? 500,
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateAIConfig({
        enabled,
        provider: provider as "anthropic" | "openai",
        model,
        systemPrompt: systemPrompt || null,
        knowledgeBase: knowledgeBase || null,
        maxTokens,
      });
      router.refresh();
      showToast("AI config saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const providerModels = MODELS[provider] ?? [];

  return (
    <div className="mt-6 space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-brand-600"
          />
          <span className="text-sm font-medium text-zinc-200">
            Enable AI Auto-Reply
          </span>
        </label>
        <Badge variant={enabled ? "success" : "warning"}>
          {enabled ? "Active" : "Disabled"}
        </Badge>
      </div>

      {/* Provider & Model */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300">Provider</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ai-provider" className="mb-1 block text-xs text-zinc-400">
              AI Provider
            </label>
            <select
              id="ai-provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as "anthropic" | "openai");
                const first = MODELS[e.target.value]?.[0];
                if (first) setModel(first.value);
              }}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ai-model" className="mb-1 block text-xs text-zinc-400">
              Model
            </label>
            <select
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {providerModels.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ai-max-tokens" className="mb-1 block text-xs text-zinc-400">
            Max Tokens
          </label>
          <input
            id="ai-max-tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            min={50}
            max={4000}
            className="w-40 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">System Prompt</h2>
        <p className="text-xs text-zinc-500">
          Instructions for the AI. Contact info (name, tags, score) is
          automatically appended.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          placeholder="You are a helpful assistant for our Instagram shop..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* Knowledge Base */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">Knowledge Base</h2>
        <p className="text-xs text-zinc-500">
          Product info, FAQ, business details. The AI will reference this when
          answering questions.
        </p>
        <textarea
          value={knowledgeBase}
          onChange={(e) => setKnowledgeBase(e.target.value)}
          rows={8}
          placeholder="Our shop hours: Mon-Fri 10am-6pm&#10;Return policy: 30 days..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}
