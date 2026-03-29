"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createKeywordRule,
  deleteKeywordRule,
  type KeywordRule,
} from "@/lib/api";

export function KeywordRulesClient({
  initialRules,
}: {
  initialRules: KeywordRule[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createKeywordRule({
        keyword: fd.get("keyword") as string,
        matchType: fd.get("matchType") as string,
        responseText: fd.get("responseText") as string,
      });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKeywordRule(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    { key: "keyword", label: "Keyword" },
    {
      key: "matchType",
      label: "Match Type",
      render: (r: KeywordRule) => (
        <Badge>{r.matchType}</Badge>
      ),
    },
    {
      key: "responseText",
      label: "Response",
      render: (r: KeywordRule) => (
        <span className="max-w-xs truncate block text-zinc-300">
          {r.responseText}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (r: KeywordRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: KeywordRule) => (
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
          {initialRules.length} rule(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Rule"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="keyword"
              placeholder="Keyword"
              required
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
            <select
              name="matchType"
              defaultValue="contains"
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="exact">Exact</option>
              <option value="contains">Contains</option>
              <option value="regex">Regex</option>
            </select>
            <input
              name="responseText"
              placeholder="Response text"
              required
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialRules}
          keyField="id"
          emptyMessage="No keyword rules yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Keyword Rule"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
