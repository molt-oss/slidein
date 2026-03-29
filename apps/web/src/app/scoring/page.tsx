import { fetchScoringRules } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { ScoringRule } from "@/lib/api";
import { ScoringClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ScoringPage() {
  const { data, error } = await safeFetch<ScoringRule[]>(
    () => fetchScoringRules(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Scoring Rules</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not load scoring rules.
        </div>
      )}
      <ScoringClient initialRules={data} />
    </div>
  );
}
