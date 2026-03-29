"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createScenario, deleteScenario, type Scenario } from "@/lib/api";

export function ScenariosClient({
  initialScenarios,
}: {
  initialScenarios: Scenario[];
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
      await createScenario({
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        triggerType: fd.get("triggerType") as string,
        triggerValue: (fd.get("triggerValue") as string) || null,
        steps: [
          {
            stepOrder: 1,
            messageText: fd.get("firstMessage") as string,
            delaySeconds: 0,
          },
        ],
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
      await deleteScenario(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (r: Scenario) => (
        <Link
          href={`/scenarios/${r.id}`}
          className="font-medium text-brand-400 hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "triggerType",
      label: "Trigger",
      render: (r: Scenario) => <Badge>{r.triggerType}</Badge>,
    },
    {
      key: "enabled",
      label: "Status",
      render: (r: Scenario) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (r: Scenario) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: Scenario) => (
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
          {initialScenarios.length} scenario(s)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Scenario"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Scenario name"
              required
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
            <select
              name="triggerType"
              defaultValue="keyword"
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="keyword">Keyword</option>
              <option value="comment">Comment</option>
              <option value="api">API</option>
            </select>
          </div>
          <input
            name="triggerValue"
            placeholder="Trigger value (optional)"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <textarea
            name="firstMessage"
            placeholder="First step message"
            required
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Scenario"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialScenarios}
          keyField="id"
          emptyMessage="No scenarios yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Scenario"
        message="This will delete the scenario and all its steps. Are you sure?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
