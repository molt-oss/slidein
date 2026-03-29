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
      <h1 className="text-2xl font-bold">AI Auto-Reply</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Configure AI-powered automatic responses using Claude or OpenAI.
      </p>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not load AI configuration.
        </div>
      )}
      <AIClient initialConfig={data} />
    </div>
  );
}
