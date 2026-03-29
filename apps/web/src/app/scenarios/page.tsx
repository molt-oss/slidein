import { fetchScenarios } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { Scenario } from "@/lib/api";
import { ScenariosClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const { data, error } = await safeFetch<Scenario[]>(
    () => fetchScenarios(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">シナリオ管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ シナリオを読み込めませんでした。
        </div>
      )}
      <ScenariosClient initialScenarios={data} />
    </div>
  );
}
