"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createForm,
  deleteForm,
  fetchFormResponses,
  type Form,
  type FormField,
  type FormResponse,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function FormsClient({
  initialForms,
}: {
  initialForms: Form[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FormField[]>([
    { label: "", type: "text", key: "" },
  ]);
  const [responses, setResponses] = useState<{
    formName: string;
    data: FormResponse[];
  } | null>(null);

  const addField = () => {
    setFields([...fields, { label: "", type: "text", key: "" }]);
  };

  const updateField = (idx: number, key: keyof FormField, value: string) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value } as FormField;
    setFields(next);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createForm({
        name: fd.get("name") as string,
        fields: fields.filter((f) => f.label && f.key),
        thankYouMessage: (fd.get("thankYouMessage") as string) || undefined,
      });
      setShowForm(false);
      setFields([{ label: "", type: "text", key: "" }]);
      router.refresh();
      showToast("フォームを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteForm(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("フォームを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const handleViewResponses = async (form: Form) => {
    try {
      const result = await fetchFormResponses(form.id);
      setResponses({ formName: form.name, data: result.data });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  };

  const columns = [
    { key: "name", label: "フォーム名" },
    {
      key: "fields",
      label: "フィールド数",
      render: (r: Form) => (
        <span className="text-sm text-zinc-400">{r.fields.length} 件</span>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
      render: (r: Form) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: Form) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewResponses(r)}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            回答一覧
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
          {initialForms.length} 件のフォーム
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規フォーム"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="fm-name" className="mb-1 block text-xs text-zinc-400">フォーム名</label>
            <input
              id="fm-name"
              name="name"
              placeholder="例: アンケート"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">フィールド</label>
            {fields.map((f, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <input
                  placeholder="ラベル（質問文）"
                  value={f.label}
                  onChange={(e) => updateField(idx, "label", e.target.value)}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
                <input
                  placeholder="キー"
                  value={f.key}
                  onChange={(e) => updateField(idx, "key", e.target.value)}
                  className="w-28 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
                />
                <select
                  value={f.type}
                  onChange={(e) => updateField(idx, "type", e.target.value)}
                  className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100"
                >
                  <option value="text">テキスト</option>
                  <option value="number">数値</option>
                  <option value="email">メール</option>
                </select>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addField}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              + フィールド追加
            </button>
          </div>
          <div>
            <label htmlFor="fm-thanks" className="mb-1 block text-xs text-zinc-400">
              サンクスメッセージ
            </label>
            <input
              id="fm-thanks"
              name="thankYouMessage"
              placeholder="ありがとうございます！"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "フォームを作成"}
          </button>
        </form>
      )}

      {responses && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-100">
              回答一覧: {responses.formName}
            </h3>
            <button
              onClick={() => setResponses(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              閉じる
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {responses.data.length === 0 ? (
              <p className="text-sm text-zinc-500">まだ回答がないよ</p>
            ) : (
              responses.data.map((r) => (
                <div
                  key={r.id}
                  className="rounded border border-zinc-700 bg-zinc-800 p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>コンタクト: {r.contactId}</span>
                    <Badge variant={r.completedAt ? "success" : "warning"}>
                      {r.completedAt ? "完了" : "回答中"}
                    </Badge>
                  </div>
                  <pre className="mt-1 text-xs text-zinc-300">
                    {JSON.stringify(r.responses, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialForms}
          keyField="id"
          emptyMessage="フォームを作成して、DM経由でアンケートを実施しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="フォームの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
