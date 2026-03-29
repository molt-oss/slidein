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
  add_tag: "タグ追加",
  remove_tag: "タグ削除",
  start_scenario: "シナリオ開始",
  send_message: "メッセージ送信",
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
      showToast("自動化ルールを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
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
      showToast("自動化ルールを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    { key: "name", label: "ルール名" },
    {
      key: "eventType",
      label: "イベント",
      render: (r: AutomationRule) => <Badge>{r.eventType}</Badge>,
    },
    {
      key: "actions",
      label: "アクション",
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
      label: "ステータス",
      render: (r: AutomationRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "有効" : "無効"}
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
          削除
        </button>
      ),
    },
  ];

  const actionValueLabel: Record<string, string> = {
    add_tag: "タグ名",
    remove_tag: "タグ名",
    start_scenario: "シナリオID",
    send_message: "メッセージ本文",
  };

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialRules.length} 件のルール
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規ルール"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ar-name" className="mb-1 block text-xs text-zinc-400">ルール名</label>
              <input
                id="ar-name"
                name="name"
                placeholder="例: キーワードでVIPタグ付与"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="ar-eventType" className="mb-1 block text-xs text-zinc-400">イベントタイプ</label>
              <input
                id="ar-eventType"
                name="eventType"
                placeholder="例: message_received"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ar-actionType" className="mb-1 block text-xs text-zinc-400">アクションタイプ</label>
              <select
                id="ar-actionType"
                name="actionType"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="add_tag">タグ追加</option>
                <option value="remove_tag">タグ削除</option>
                <option value="start_scenario">シナリオ開始</option>
                <option value="send_message">メッセージ送信</option>
              </select>
            </div>
            <div>
              <label htmlFor="ar-actionValue" className="mb-1 block text-xs text-zinc-400">
                {actionValueLabel[actionType] ?? "値"}
              </label>
              <input
                id="ar-actionValue"
                name="actionValue"
                placeholder={actionValueLabel[actionType] ?? "値"}
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
            {loading ? "作成中..." : "ルールを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialRules}
          keyField="id"
          emptyMessage="自動化ルールを作成して、イベントに応じた自動アクションを設定しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="自動化ルールの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
