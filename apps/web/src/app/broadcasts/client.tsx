"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createBroadcast,
  sendBroadcast,
  deleteBroadcast,
  type Broadcast,
} from "@/lib/api";
import { useToast } from "@/components/toast";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  draft: "default",
  scheduled: "warning",
  sending: "warning",
  completed: "success",
  failed: "danger",
};

export function BroadcastsClient({
  initialBroadcasts,
}: {
  initialBroadcasts: Broadcast[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createBroadcast({
        title: fd.get("title") as string,
        messageText: fd.get("messageText") as string,
        targetType: fd.get("targetType") as string,
        targetValue: (fd.get("targetValue") as string) || null,
        scheduledAt: (fd.get("scheduledAt") as string) || null,
      });
      setShowForm(false);
      router.refresh();
      showToast("Broadcast created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    setSending(id);
    try {
      await sendBroadcast(id);
      router.refresh();
      showToast("Broadcast sent", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBroadcast(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Broadcast deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    { key: "title", label: "Title" },
    {
      key: "targetType",
      label: "Target",
      render: (r: Broadcast) => (
        <span className="text-sm text-zinc-300">
          {r.targetType === "all" ? "All contacts" : `Tag: ${r.targetValue}`}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r: Broadcast) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "sentCount",
      label: "Sent / Failed",
      render: (r: Broadcast) => (
        <span className="text-sm text-zinc-400">
          {r.sentCount} / {r.failedCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: Broadcast) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: Broadcast) => (
        <div className="flex gap-2">
          {(r.status === "draft" || r.status === "scheduled") && (
            <button
              onClick={() => handleSend(r.id)}
              disabled={sending === r.id}
              className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
            >
              {sending === r.id ? "Sending..." : "Send Now"}
            </button>
          )}
          <button
            onClick={() => setDeleteTarget(r.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialBroadcasts.length} broadcast(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Broadcast"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="bc-title" className="mb-1 block text-xs text-zinc-400">Title</label>
              <input
                id="bc-title"
                name="title"
                placeholder="Broadcast title"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="bc-targetType" className="mb-1 block text-xs text-zinc-400">Target</label>
              <select
                id="bc-targetType"
                name="targetType"
                defaultValue="all"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="all">All Contacts</option>
                <option value="tag">By Tag</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="bc-targetValue" className="mb-1 block text-xs text-zinc-400">Tag (if target = tag)</label>
            <input
              id="bc-targetValue"
              name="targetValue"
              placeholder="e.g. vip"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="bc-messageText" className="mb-1 block text-xs text-zinc-400">Message</label>
            <textarea
              id="bc-messageText"
              name="messageText"
              placeholder="Message text (supports {{name}}, {{username}}, etc.)"
              required
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="bc-scheduledAt" className="mb-1 block text-xs text-zinc-400">Schedule (optional)</label>
            <input
              id="bc-scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Broadcast"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialBroadcasts}
          keyField="id"
          emptyMessage="No broadcasts yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Broadcast"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
