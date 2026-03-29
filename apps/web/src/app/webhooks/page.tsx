import { fetchWebhookEndpoints } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { WebhookEndpoint } from "@/lib/api";
import { WebhooksClient } from "./client";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const { data, error } = await safeFetch<WebhookEndpoint[]>(
    () => fetchWebhookEndpoints(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Webhook管理</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Webhookエンドポイントを読み込めませんでした。
        </div>
      )}
      <WebhooksClient initialEndpoints={data} />
    </div>
  );
}
