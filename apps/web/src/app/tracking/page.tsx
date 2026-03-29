import { fetchTrackedLinks } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { TrackedLink } from "@/lib/api";
import { TrackingClient } from "./client";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const { data, error } = await safeFetch<TrackedLink[]>(
    () => fetchTrackedLinks(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">トラッキングリンク管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ トラッキングリンクを読み込めませんでした。
        </div>
      )}
      <TrackingClient initialLinks={data} />
    </div>
  );
}
