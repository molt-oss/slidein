import { fetchScenario } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { ScenarioWithSteps } from "@/lib/api";
import { ScenarioDetailClient } from "./client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScenarioDetailPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await safeFetch<ScenarioWithSteps | null>(
    async () => {
      const res = await fetchScenario(id);
      return { data: res.data };
    },
    null,
  );

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold">シナリオが見つかりません</h1>
        <p className="mt-4 text-sm text-zinc-400">
          {error ?? "シナリオを読み込めませんでした。"}
        </p>
      </div>
    );
  }

  return <ScenarioDetailClient scenario={data} />;
}
