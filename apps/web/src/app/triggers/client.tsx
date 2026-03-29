"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createCommentTrigger,
  deleteCommentTrigger,
  type CommentTrigger,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function TriggersClient({
  initialTriggers,
}: {
  initialTriggers: CommentTrigger[];
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
      await createCommentTrigger({
        dmResponseText: fd.get("dmResponseText") as string,
        mediaIdFilter: (fd.get("mediaIdFilter") as string) || null,
        keywordFilter: (fd.get("keywordFilter") as string) || null,
      });
      setShowForm(false);
      router.refresh();
      showToast("コメントトリガーを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCommentTrigger(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("コメントトリガーを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    {
      key: "dmResponseText",
      label: "DM返信メッセージ",
      render: (r: CommentTrigger) => (
        <span className="max-w-xs truncate block text-zinc-300">
          {r.dmResponseText}
        </span>
      ),
    },
    {
      key: "keywordFilter",
      label: "キーワードフィルター",
      render: (r: CommentTrigger) => (
        <span className="text-zinc-400">
          {r.keywordFilter ?? "—"}
        </span>
      ),
    },
    {
      key: "mediaIdFilter",
      label: "メディアID",
      render: (r: CommentTrigger) => (
        <span className="font-mono text-xs text-zinc-500">
          {r.mediaIdFilter ?? "すべて"}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "ステータス",
      render: (r: CommentTrigger) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "有効" : "無効"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: CommentTrigger) => (
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
          {initialTriggers.length} 件のトリガー
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規トリガー"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="tr-dmResponseText" className="mb-1 block text-xs text-zinc-400">DM返信メッセージ</label>
              <input
                id="tr-dmResponseText"
                name="dmResponseText"
                placeholder="DM返信メッセージを入力..."
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="tr-keywordFilter" className="mb-1 block text-xs text-zinc-400">キーワードフィルター</label>
              <input
                id="tr-keywordFilter"
                name="keywordFilter"
                placeholder="キーワードフィルター（任意）"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="tr-mediaIdFilter" className="mb-1 block text-xs text-zinc-400">メディアIDフィルター</label>
              <input
                id="tr-mediaIdFilter"
                name="mediaIdFilter"
                placeholder="メディアIDフィルター（任意）"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialTriggers}
          keyField="id"
          emptyMessage="コメントトリガーを作成して、投稿コメントからDM自動送信を設定しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="コメントトリガーの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
