import { fetchAutomations } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { AutomationRule } from "@/lib/api";
import { AutomationsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const { data, error } = await safeFetch<AutomationRule[]>(
    () => fetchAutomations(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">自動化ルール管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ 自動化ルールを読み込めませんでした。
        </div>
      )}
      <AutomationsClient initialRules={data} />
    </div>
  );
}
