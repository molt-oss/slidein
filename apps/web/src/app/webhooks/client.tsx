"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  type WebhookEndpoint,
} from "@/lib/api";
import { useToast } from "@/components/toast";

export function WebhooksClient({
  initialEndpoints,
}: {
  initialEndpoints: WebhookEndpoint[];
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
      const eventsRaw = (fd.get("events") as string) || "";
      const events = eventsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      await createWebhookEndpoint({
        url: fd.get("url") as string,
        events,
        secret: fd.get("secret") as string,
      });
      setShowForm(false);
      router.refresh();
      showToast("Webhookエンドポイントを作成しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWebhookEndpoint(deleteTarget);
      setDeleteTarget(null);
      router.refresh();
      showToast("Webhookエンドポイントを削除しました", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const columns = [
    {
      key: "url",
      label: "URL",
      render: (r: WebhookEndpoint) => (
        <span className="max-w-[250px] truncate text-sm text-zinc-300" title={r.url}>
          {r.url}
        </span>
      ),
    },
    {
      key: "events",
      label: "イベント",
      render: (r: WebhookEndpoint) => (
        <div className="flex flex-wrap gap-1">
          {r.events.map((ev) => (
            <Badge key={ev} variant="default">{ev}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "enabled",
      label: "ステータス",
      render: (r: WebhookEndpoint) => (
        <Badge variant={r.enabled ? "success" : "default"}>
          {r.enabled ? "有効" : "無効"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "作成日",
      render: (r: WebhookEndpoint) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: WebhookEndpoint) => (
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
          {initialEndpoints.length} 件のエンドポイント
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {showForm ? "キャンセル" : "+ 新規エンドポイント"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
        >
          <div>
            <label htmlFor="wh-url" className="mb-1 block text-xs text-zinc-400">Webhook URL</label>
            <input
              id="wh-url"
              name="url"
              placeholder="https://example.com/webhook"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="wh-events" className="mb-1 block text-xs text-zinc-400">
              イベント（カンマ区切り）
            </label>
            <input
              id="wh-events"
              name="events"
              placeholder="message_received, keyword_matched"
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="wh-secret" className="mb-1 block text-xs text-zinc-400">シークレット（HMACキー）</label>
            <input
              id="wh-secret"
              name="secret"
              placeholder="Webhookシークレットを入力..."
              required
              minLength={8}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "作成中..." : "エンドポイントを作成"}
          </button>
        </form>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={initialEndpoints}
          keyField="id"
          emptyMessage="Webhookエンドポイントを作成して、外部サービスにイベントを通知しよう！"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Webhookエンドポイントの削除"
        message="本当に削除する？この操作は取り消せないよ。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
