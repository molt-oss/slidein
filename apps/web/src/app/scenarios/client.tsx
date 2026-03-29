"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createScenario, deleteScenario, type Scenario } from "@/lib/api";
import { useToast } from "@/components/toast";

export function ScenariosClient({
  initialScenarios,
}: {
  initialScenarios: Scenario[];
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
      showToast("シナリオを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
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
      showToast("シナリオを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    {
      key: "name",
      label: "シナリオ名",
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
      label: "トリガー",
      render: (r: Scenario) => <Badge>{r.triggerType}</Badge>,
    },
    {
      key: "enabled",
      label: "ステータス",
      render: (r: Scenario) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "有効" : "無効"}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      label: "更新日",
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
          削除
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {initialScenarios.length} 件のシナリオ
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規シナリオ"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sc-name" className="mb-1 block text-xs text-zinc-400">シナリオ名</label>
              <input
                id="sc-name"
                name="name"
                placeholder="シナリオ名を入力..."
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="sc-triggerType" className="mb-1 block text-xs text-zinc-400">トリガータイプ</label>
              <select
                id="sc-triggerType"
                name="triggerType"
                defaultValue="keyword"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="keyword">キーワード</option>
                <option value="comment">コメント</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sc-triggerValue" className="mb-1 block text-xs text-zinc-400">トリガー値</label>
            <input
              id="sc-triggerValue"
              name="triggerValue"
              placeholder="トリガー値（任意）"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="sc-description" className="mb-1 block text-xs text-zinc-400">説明</label>
            <input
              id="sc-description"
              name="description"
              placeholder="説明（任意）"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="sc-firstMessage" className="mb-1 block text-xs text-zinc-400">最初のステップメッセージ</label>
            <textarea
              id="sc-firstMessage"
              name="firstMessage"
              placeholder="最初のステップメッセージを入力..."
              required
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "シナリオを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialScenarios}
          keyField="id"
          emptyMessage="シナリオを作成して、ステップDMを自動配信しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="シナリオの削除"
        message="シナリオと全ステップが削除されるよ。本当に削除する？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
