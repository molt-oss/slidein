import { fetchKeywordRules } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { KeywordRule } from "@/lib/api";
import { KeywordRulesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const { data, error } = await safeFetch<KeywordRule[]>(
    () => fetchKeywordRules(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">キーワード管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ キーワードルールを読み込めませんでした。
        </div>
      )}
      <KeywordRulesClient initialRules={data} />
    </div>
  );
}
