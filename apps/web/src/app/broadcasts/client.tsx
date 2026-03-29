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

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  sending: "送信中",
  completed: "完了",
  failed: "失敗",
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
      showToast("ブロードキャストを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    setSending(id);
    try {
      await sendBroadcast(id);
      router.refresh();
      showToast("ブロードキャストを送信しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "送信に失敗しました");
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
      showToast("ブロードキャストを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    { key: "title", label: "タイトル" },
    {
      key: "targetType",
      label: "対象",
      render: (r: Broadcast) => (
        <span className="text-sm text-zinc-300">
          {r.targetType === "all" ? "全コンタクト" : `タグ: ${r.targetValue}`}
        </span>
      ),
    },
    {
      key: "status",
      label: "ステータス",
      render: (r: Broadcast) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
          {STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "sentCount",
      label: "送信 / 失敗",
      render: (r: Broadcast) => (
        <span className="text-sm text-zinc-400">
          {r.sentCount} / {r.failedCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
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
              {sending === r.id ? "送信中..." : "今すぐ送信"}
            </button>
          )}
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
          {initialBroadcasts.length} 件のブロードキャスト
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規ブロードキャスト"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="bc-title" className="mb-1 block text-xs text-zinc-400">タイトル</label>
              <input
                id="bc-title"
                name="title"
                placeholder="ブロードキャストのタイトル"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="bc-targetType" className="mb-1 block text-xs text-zinc-400">対象</label>
              <select
                id="bc-targetType"
                name="targetType"
                defaultValue="all"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="all">全コンタクト</option>
                <option value="tag">タグ指定</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="bc-targetValue" className="mb-1 block text-xs text-zinc-400">タグ（対象がタグ指定の場合）</label>
            <input
              id="bc-targetValue"
              name="targetValue"
              placeholder="例: vip"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="bc-messageText" className="mb-1 block text-xs text-zinc-400">メッセージ</label>
            <textarea
              id="bc-messageText"
              name="messageText"
              placeholder="メッセージ本文（{{name}}、{{username}} 等のテンプレート変数が使えます）"
              required
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="bc-scheduledAt" className="mb-1 block text-xs text-zinc-400">予約日時（任意）</label>
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
            {loading ? "作成中..." : "ブロードキャストを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialBroadcasts}
          keyField="id"
          emptyMessage="ブロードキャストを作成して、コンタクトに一斉DMを送ろう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="ブロードキャストの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
