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
  message_received: "メッセージ受信",
  keyword_matched: "キーワードマッチ",
  link_clicked: "リンククリック",
  scenario_completed: "シナリオ完了",
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
      showToast("スコアリングルールを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
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
      showToast("スコアリングルールを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    {
      key: "eventType",
      label: "イベント",
      render: (r: ScoringRule) => (
        <Badge>{EVENT_LABELS[r.eventType] ?? r.eventType}</Badge>
      ),
    },
    {
      key: "points",
      label: "ポイント",
      render: (r: ScoringRule) => (
        <span className="font-medium text-zinc-200">
          {r.points > 0 ? `+${r.points}` : r.points}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "ステータス",
      render: (r: ScoringRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "有効" : "無効"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
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
          削除
        </button>
      ),
    },
  ];

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
              <label htmlFor="sr-eventType" className="mb-1 block text-xs text-zinc-400">イベントタイプ</label>
              <select
                id="sr-eventType"
                name="eventType"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="message_received">メッセージ受信</option>
                <option value="keyword_matched">キーワードマッチ</option>
                <option value="link_clicked">リンククリック</option>
                <option value="scenario_completed">シナリオ完了</option>
              </select>
            </div>
            <div>
              <label htmlFor="sr-points" className="mb-1 block text-xs text-zinc-400">ポイント</label>
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
            {loading ? "作成中..." : "ルールを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialRules}
          keyField="id"
          emptyMessage="スコアリングルールを作成して、コンタクトの行動をスコア化しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="スコアリングルールの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
