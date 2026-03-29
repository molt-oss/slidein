import { fetchDeliverySettings } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { DeliverySettings } from "@/lib/api";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: DeliverySettings = {
  id: "default",
  startHour: 9,
  endHour: 23,
  timezone: "Asia/Tokyo",
};

export default async function SettingsPage() {
  const { data, error } = await safeFetch<DeliverySettings>(
    () => fetchDeliverySettings(),
    DEFAULT_SETTINGS,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">設定</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ 設定を読み込めませんでした。
        </div>
      )}
      <SettingsClient initialSettings={data} />
    </div>
  );
}
