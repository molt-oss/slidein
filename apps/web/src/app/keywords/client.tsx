"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createKeywordRule,
  deleteKeywordRule,
  type KeywordRule,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function KeywordRulesClient({
  initialRules,
}: {
  initialRules: KeywordRule[];
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
      await createKeywordRule({
        keyword: fd.get("keyword") as string,
        matchType: fd.get("matchType") as string,
        responseText: fd.get("responseText") as string,
      });
      setShowForm(false);
      router.refresh();
      showToast("キーワードルールを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKeywordRule(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("キーワードルールを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    { key: "keyword", label: "キーワード" },
    {
      key: "matchType",
      label: "マッチタイプ",
      render: (r: KeywordRule) => (
        <Badge>{r.matchType}</Badge>
      ),
    },
    {
      key: "responseText",
      label: "返信メッセージ",
      render: (r: KeywordRule) => (
        <span className="max-w-xs truncate block text-zinc-300">
          {r.responseText}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "ステータス",
      render: (r: KeywordRule) => (
        <Badge variant={r.enabled ? "success" : "warning"}>
          {r.enabled ? "有効" : "無効"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: KeywordRule) => (
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="kw-keyword" className="mb-1 block text-xs text-zinc-400">キーワード</label>
              <input
                id="kw-keyword"
                name="keyword"
                placeholder="キーワードを入力..."
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="kw-matchType" className="mb-1 block text-xs text-zinc-400">マッチタイプ</label>
              <select
                id="kw-matchType"
                name="matchType"
                defaultValue="contains"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="exact">完全一致</option>
                <option value="contains">部分一致</option>
                <option value="regex">正規表現</option>
              </select>
            </div>
            <div>
              <label htmlFor="kw-responseText" className="mb-1 block text-xs text-zinc-400">返信メッセージ</label>
              <input
                id="kw-responseText"
                name="responseText"
                placeholder="返信メッセージを入力..."
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
            {loading ? "作成中..." : "作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialRules}
          keyField="id"
          emptyMessage="キーワードルールを作成して、DMの自動返信を設定しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="キーワードルールの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
