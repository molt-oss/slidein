import { fetchAIConfig } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { AIConfig } from "@/lib/api";
import { AIClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const { data, error } = await safeFetch<AIConfig | null>(
    () => fetchAIConfig(),
    null,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">AI自動応答設定</h1>
      <p className="mt-1 text-sm text-zinc-400">
        ClaudeやOpenAIを使ったAI自動応答を設定できます。
      </p>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ AI設定を読み込めませんでした。
        </div>
      )}
      <AIClient initialConfig={data} />
    </div>
  );
}
