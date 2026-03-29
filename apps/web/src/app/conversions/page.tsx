import { fetchConversionGoals } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { ConversionGoal } from "@/lib/api";
import { ConversionsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ConversionsPage() {
  const { data, error } = await safeFetch<ConversionGoal[]>(
    () => fetchConversionGoals(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">CV計測</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ コンバージョンゴールを読み込めませんでした。
        </div>
      )}
      <ConversionsClient initialGoals={data} />
    </div>
  );
}
