import { fetchBroadcasts } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { Broadcast } from "@/lib/api";
import { BroadcastsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BroadcastsPage() {
  const { data, error } = await safeFetch<Broadcast[]>(
    () => fetchBroadcasts(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Broadcasts</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not load broadcasts.
        </div>
      )}
      <BroadcastsClient initialBroadcasts={data} />
    </div>
  );
}
