"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createAutomation,
  deleteAutomation,
  type AutomationRule,
} from "@/lib/api";
import { useToast } from "@/components/toast";

const ACTION_LABELS: Record<string, string> = {
  add_tag: "Add Tag",
  remove_tag: "Remove Tag",
  start_scenario: "Start Scenario",
  send_message: "Send Message",
};

export function AutomationsClient({
  initialRules,
}: {
  initialRules: AutomationRule[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState("add_tag");

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const at = fd.get("actionType") as string;
    const actionValue = fd.get("actionValue") as string;

    const action: { type: string; tag?: string; scenarioId?: string; messageText?: string } = { type: at };
    if (at === "add_tag" || at === "remove_tag") action.tag = actionValue;
    else if (at === "start_scenario") action.scenarioId = actionValue;
    else if (at === "send_message") action.messageText = actionValue;

    try {
      await createAutomation({
        name: fd.get("name") as string,
        eventType: fd.get("eventType") as string,
        actions: [action],
      });
      setShowForm(false);
      router.refresh();
      showToast("Automation rule created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAutomation(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Automation rule deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "eventType",
      label: "Event",
      render: (r: AutomationRule) => <Badge>{r.eventType}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (r: AutomationRule) => (
        <div className="flex flex-wrap gap-1">
          {r.actions.map((a, i) => (
            <Badge key={i}>
              {ACTION_LABELS[a.type] ?? a.type}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: (r: AutomationRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "delete",
      label: "",
      render: (r: AutomationRule) => (
        <button
          onClick={() => setDeleteTarget(r.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      ),
    },
  ];

  const actionValueLabel: Record<string, string> = {
    add_tag: "Tag name",
    remove_tag: "Tag name",
    start_scenario: "Scenario ID",
    send_message: "Message text",
  };

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
              <label htmlFor="ar-name" className="mb-1 block text-xs text-zinc-400">Rule Name</label>
              <input
                id="ar-name"
                name="name"
                placeholder="e.g. Tag VIP on keyword"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="ar-eventType" className="mb-1 block text-xs text-zinc-400">Event Type</label>
              <input
                id="ar-eventType"
                name="eventType"
                placeholder="e.g. message_received"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ar-actionType" className="mb-1 block text-xs text-zinc-400">Action Type</label>
              <select
                id="ar-actionType"
                name="actionType"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="add_tag">Add Tag</option>
                <option value="remove_tag">Remove Tag</option>
                <option value="start_scenario">Start Scenario</option>
                <option value="send_message">Send Message</option>
              </select>
            </div>
            <div>
              <label htmlFor="ar-actionValue" className="mb-1 block text-xs text-zinc-400">
                {actionValueLabel[actionType] ?? "Value"}
              </label>
              <input
                id="ar-actionValue"
                name="actionValue"
                placeholder={actionValueLabel[actionType] ?? "Value"}
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
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
          emptyMessage="No automation rules yet."
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Automation Rule"
        message="Are you sure? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
