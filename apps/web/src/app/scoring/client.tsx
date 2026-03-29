"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createScoringRule,
  deleteScoringRule,
  type ScoringRule,
} from "@/lib/api";
import { useToast } from "@/components/toast";

const EVENT_LABELS: Record<string, string> = {
  message_received: "Message Received",
  keyword_matched: "Keyword Matched",
  link_clicked: "Link Clicked",
  scenario_completed: "Scenario Completed",
};

export function ScoringClient({
  initialRules,
}: {
  initialRules: ScoringRule[];
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
      await createScoringRule({
        eventType: fd.get("eventType") as string,
        points: Number(fd.get("points")),
      });
      setShowForm(false);
      router.refresh();
      showToast("Scoring rule created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteScoringRule(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Scoring rule deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    {
      key: "eventType",
      label: "Event",
      render: (r: ScoringRule) => (
        <Badge>{EVENT_LABELS[r.eventType] ?? r.eventType}</Badge>
      ),
    },
    {
      key: "points",
      label: "Points",
      render: (r: ScoringRule) => (
        <span className="font-medium text-zinc-200">
          {r.points > 0 ? `+${r.points}` : r.points}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (r: ScoringRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: ScoringRule) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: ScoringRule) => (
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sr-eventType" className="mb-1 block text-xs text-zinc-400">Event Type</label>
              <select
                id="sr-eventType"
                name="eventType"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="message_received">Message Received</option>
                <option value="keyword_matched">Keyword Matched</option>
                <option value="link_clicked">Link Clicked</option>
                <option value="scenario_completed">Scenario Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="sr-points" className="mb-1 block text-xs text-zinc-400">Points</label>
              <input
                id="sr-points"
                name="points"
                type="number"
                defaultValue={1}
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Rule"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialRules}
          keyField="id"
          emptyMessage="No scoring rules yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Scoring Rule"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
