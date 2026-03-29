"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createConversionGoal,
  deleteConversionGoal,
  fetchConversionReport,
  type ConversionGoal,
  type ConversionReport,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function ConversionsClient({
  initialGoals,
}: {
  initialGoals: ConversionGoal[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ConversionReport | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createConversionGoal({
        name: fd.get("name") as string,
        eventType: fd.get("eventType") as string,
        targetValue: (fd.get("targetValue") as string) || null,
      });
      setShowForm(false);
      router.refresh();
      showToast("コンバージョンゴールを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConversionGoal(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("コンバージョンゴールを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleViewReport = async (goalId: string) => {
    try {
      const result = await fetchConversionReport(goalId);
      setReport(result.data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "レポートの読み込みに失敗しました");
    }
  };

  const columns = [
    { key: "name", label: "ゴール名" },
    {
      key: "eventType",
      label: "イベントタイプ",
      render: (r: ConversionGoal) => (
        <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
          {r.eventType}
        </code>
      ),
    },
    {
      key: "targetValue",
      label: "目標値",
      render: (r: ConversionGoal) => (
        <span className="text-sm text-zinc-400">{r.targetValue ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
      render: (r: ConversionGoal) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: ConversionGoal) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewReport(r.id)}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            レポート
          </button>
          <button
            onClick={() => setDeleteTarget(r.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            削除
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialGoals.length} 件のゴール
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規ゴール"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cv-name" className="mb-1 block text-xs text-zinc-400">ゴール名</label>
              <input
                id="cv-name"
                name="name"
                placeholder="例: 購入完了"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="cv-eventType" className="mb-1 block text-xs text-zinc-400">イベントタイプ</label>
              <input
                id="cv-eventType"
                name="eventType"
                placeholder="例: link_clicked"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cv-target" className="mb-1 block text-xs text-zinc-400">目標値（任意）</label>
            <input
              id="cv-target"
              name="targetValue"
              placeholder="例: 100"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "ゴールを作成"}
          </button>
        </form>
      )}

      {report && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">
              レポート: {report.goalName}
            </h3>
            <button
              onClick={() => setReport(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              閉じる
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">総CV数</p>
              <p className="text-xl font-bold text-zinc-100">{report.totalConversions}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">ユニークコンタクト</p>
              <p className="text-xl font-bold text-zinc-100">{report.uniqueContacts}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">総コンタクト数</p>
              <p className="text-xl font-bold text-zinc-100">{report.totalContacts}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">CVR</p>
              <p className="text-xl font-bold text-brand-400">{report.cvr}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialGoals}
          keyField="id"
          emptyMessage="コンバージョンゴールを作成して、成果を計測しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="コンバージョンゴールの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
