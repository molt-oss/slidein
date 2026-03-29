"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDeliverySettings, type DeliverySettings } from "@/lib/api";
import { useToast } from "@/components/toast";

export function SettingsClient({
  initialSettings,
}: {
  initialSettings: DeliverySettings;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startHour, setStartHour] = useState(initialSettings.startHour);
  const [endHour, setEndHour] = useState(initialSettings.endHour);
  const [timezone, setTimezone] = useState(initialSettings.timezone);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDeliverySettings({ startHour, endHour, timezone });
      router.refresh();
      showToast("Settings saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="mt-6 max-w-lg">
      <h2 className="text-lg font-semibold text-zinc-100">
        Delivery Hours
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Messages will only be sent within this time window. Outside this range,
        messages are queued until the next delivery window.
      </p>

      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ds-start" className="mb-1 block text-xs text-zinc-400">
              Start Hour
            </label>
            <select
              id="ds-start"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {hours.filter((h) => h < 24).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ds-end" className="mb-1 block text-xs text-zinc-400">
              End Hour
            </label>
            <select
              id="ds-end"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              {hours.filter((h) => h >= 1).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ds-tz" className="mb-1 block text-xs text-zinc-400">
            Timezone
          </label>
          <input
            id="ds-tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Tokyo"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
        </div>

        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-zinc-400">
          Current window: <strong className="text-zinc-200">
            {String(startHour).padStart(2, "0")}:00 – {String(endHour).padStart(2, "0")}:00
          </strong> ({timezone})
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
