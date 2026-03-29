import { fetchForms } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { Form } from "@/lib/api";
import { FormsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const { data, error } = await safeFetch<Form[]>(
    () => fetchForms(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">フォーム管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ フォームを読み込めませんでした。
        </div>
      )}
      <FormsClient initialForms={data} />
    </div>
  );
}
