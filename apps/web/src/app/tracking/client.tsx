"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createTrackedLink, deleteTrackedLink, type TrackedLink } from "@/lib/api";
import { useToast } from "@/components/toast";

export function TrackingClient({
  initialLinks,
}: {
  initialLinks: TrackedLink[];
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
      await createTrackedLink({
        originalUrl: fd.get("originalUrl") as string,
        contactTag: (fd.get("contactTag") as string) || null,
        scenarioId: (fd.get("scenarioId") as string) || null,
      });
      setShowForm(false);
      router.refresh();
      showToast("トラッキングリンクを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrackedLink(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("トラッキングリンクを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    {
      key: "shortCode",
      label: "ショートコード",
      render: (r: TrackedLink) => (
        <code className="rounded bg-zinc-800 px-2 py-1 text-xs text-brand-400">
          /t/{r.shortCode}
        </code>
      ),
    },
    {
      key: "originalUrl",
      label: "元URL",
      render: (r: TrackedLink) => (
        <span className="max-w-[200px] truncate text-sm text-zinc-300" title={r.originalUrl}>
          {r.originalUrl}
        </span>
      ),
    },
    {
      key: "contactTag",
      label: "タグ",
      render: (r: TrackedLink) => (
        <span className="text-sm text-zinc-400">{r.contactTag ?? "—"}</span>
      ),
    },
    {
      key: "clickCount",
      label: "クリック数",
      render: (r: TrackedLink) => (
        <span className="text-sm font-medium text-zinc-200">{r.clickCount}</span>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
      render: (r: TrackedLink) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: TrackedLink) => (
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
          {initialLinks.length} 件のリンク
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規リンク"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="tl-url" className="mb-1 block text-xs text-zinc-400">元URL</label>
            <input
              id="tl-url"
              name="originalUrl"
              placeholder="https://example.com"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="tl-tag" className="mb-1 block text-xs text-zinc-400">コンタクトタグ（任意）</label>
              <input
                id="tl-tag"
                name="contactTag"
                placeholder="例: clicked-promo"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="tl-scenario" className="mb-1 block text-xs text-zinc-400">シナリオID（任意）</label>
              <input
                id="tl-scenario"
                name="scenarioId"
                placeholder="シナリオID"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "リンクを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialLinks}
          keyField="id"
          emptyMessage="トラッキングリンクを作成して、クリック計測を始めよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="トラッキングリンクの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
