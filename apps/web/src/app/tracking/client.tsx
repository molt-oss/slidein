"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createTrackedLink, deleteTrackedLink, type TrackedLink } from "@/lib/api";
import { useToast } from "@/components/toast";

export function TrackingClient({
  initialLinks,
}: {
  initialLinks: TrackedLink[];
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
      await createTrackedLink({
        originalUrl: fd.get("originalUrl") as string,
        contactTag: (fd.get("contactTag") as string) || null,
        scenarioId: (fd.get("scenarioId") as string) || null,
      });
      setShowForm(false);
      router.refresh();
      showToast("Tracking link created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrackedLink(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Tracking link deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    {
      key: "shortCode",
      label: "Short Code",
      render: (r: TrackedLink) => (
        <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-brand-400">
          /t/{r.shortCode}
        </code>
      ),
    },
    {
      key: "originalUrl",
      label: "Original URL",
      render: (r: TrackedLink) => (
        <span className="max-w-[200px] truncate text-sm text-zinc-300" title={r.originalUrl}>
          {r.originalUrl}
        </span>
      ),
    },
    {
      key: "contactTag",
      label: "Tag",
      render: (r: TrackedLink) => (
        <span className="text-sm text-zinc-400">{r.contactTag ?? "—"}</span>
      ),
    },
    {
      key: "clickCount",
      label: "Clicks",
      render: (r: TrackedLink) => (
        <span className="text-sm font-medium text-zinc-200">{r.clickCount}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: TrackedLink) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: TrackedLink) => (
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
          {initialLinks.length} tracking link(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Link"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="tl-url" className="mb-1 block text-xs text-zinc-400">Original URL</label>
            <input
              id="tl-url"
              name="originalUrl"
              placeholder="https://example.com"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tl-tag" className="mb-1 block text-xs text-zinc-400">Contact Tag (optional)</label>
              <input
                id="tl-tag"
                name="contactTag"
                placeholder="e.g. clicked-promo"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="tl-scenario" className="mb-1 block text-xs text-zinc-400">Scenario ID (optional)</label>
              <input
                id="tl-scenario"
                name="scenarioId"
                placeholder="Scenario ID"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Link"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialLinks}
          keyField="id"
          emptyMessage="No tracking links yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Tracking Link"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
