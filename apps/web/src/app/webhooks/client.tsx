"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  type WebhookEndpoint,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function WebhooksClient({
  initialEndpoints,
}: {
  initialEndpoints: WebhookEndpoint[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const eventsRaw = (fd.get("events") as string) || "";
      const events = eventsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      await createWebhookEndpoint({
        url: fd.get("url") as string,
        events,
        secret: fd.get("secret") as string,
      });
      setShowForm(false);
      router.refresh();
      showToast("Webhook endpoint created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWebhookEndpoint(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Webhook endpoint deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    {
      key: "url",
      label: "URL",
      render: (r: WebhookEndpoint) => (
        <span className="max-w-[250px] truncate text-sm text-zinc-300" title={r.url}>
          {r.url}
        </span>
      ),
    },
    {
      key: "events",
      label: "Events",
      render: (r: WebhookEndpoint) => (
        <div className="flex flex-wrap gap-1">
          {r.events.map((ev) => (
            <Badge key={ev} variant="default">{ev}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (r: WebhookEndpoint) => (
        <Badge variant={r.enabled ? "success" : "default"}>
          {r.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: WebhookEndpoint) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: WebhookEndpoint) => (
        <button
          onClick={() => setDeleteTarget(r.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialEndpoints.length} endpoint(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Endpoint"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="wh-url" className="mb-1 block text-xs text-zinc-400">Webhook URL</label>
            <input
              id="wh-url"
              name="url"
              placeholder="https://example.com/webhook"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="wh-events" className="mb-1 block text-xs text-zinc-400">
              Events (comma-separated)
            </label>
            <input
              id="wh-events"
              name="events"
              placeholder="message_received, keyword_matched"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="wh-secret" className="mb-1 block text-xs text-zinc-400">Secret (HMAC key)</label>
            <input
              id="wh-secret"
              name="secret"
              placeholder="your-webhook-secret"
              required
              minLength={8}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Endpoint"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialEndpoints}
          keyField="id"
          emptyMessage="No webhook endpoints yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Webhook Endpoint"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
