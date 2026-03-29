import { StatCard } from "@/components/stat-card";
import { fetchContacts, fetchKeywordRules, fetchScenarios } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { Contact, KeywordRule, Scenario } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [contacts, rules, scenarios] = await Promise.all([
    safeFetch<Contact[]>(() => fetchContacts(), []),
    safeFetch<KeywordRule[]>(() => fetchKeywordRules(), []),
    safeFetch<Scenario[]>(() => fetchScenarios(), []),
  ]);

  const hasError = contacts.error || rules.error || scenarios.error;
  const activeRules = rules.data.filter((r) => r.enabled).length;
  const activeScenarios = scenarios.data.filter((s) => s.enabled).length;
  const isEmpty =
    contacts.data.length === 0 &&
    rules.data.length === 0 &&
    scenarios.data.length === 0;

  // 最近のコンタクト（lastMessageAtでソート）
  const recentContacts = [...contacts.data]
    .filter((c) => c.lastMessageAt)
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt!).getTime() -
        new Date(a.lastMessageAt!).getTime(),
    )
    .slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {hasError && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Worker APIに接続できませんでした。キャッシュまたは空データを表示しています。
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="コンタクト数"
          value={contacts.data.length}
          icon="👥"
        />
        <StatCard
          label="有効なキーワードルール"
          value={activeRules}
          icon="🔑"
        />
        <StatCard
          label="有効なシナリオ"
          value={activeScenarios}
          icon="🔄"
        />
      </div>

      {isEmpty && !hasError && (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-200">
            🚀 はじめよう
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            slideinへようこそ！以下の手順でDM自動化をセットアップしよう：
          </p>
          <ol className="mt-4 space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                1
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  WorkerをCloudflareにデプロイ
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Cloudflareアカウントを設定して、D1データベースと一緒にWorkerをデプロイしてね。
                </p>
                <a
                  href="https://developers.cloudflare.com/workers/get-started/guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Cloudflare Workers ドキュメント →
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                2
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  Metaアプリを作成
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Instagram APIアクセス付きのMetaアプリを作成して、WebhookURLを設定しよう。
                </p>
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Meta開発者ポータル →
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                3
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  最初のキーワードルールを作成
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  キーワードルールを作成して、特定のキーワードを含むDMに自動返信しよう！
                </p>
                <a
                  href="/keywords"
                  className="mt-2 inline-block rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
                >
                  キーワードルールを作成 →
                </a>
              </div>
            </li>
          </ol>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-zinc-300">
        最近のアクティビティ
      </h2>
      {recentContacts.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">まだメッセージがないよ</p>
      ) : (
        <div className="mt-3 space-y-2">
          {recentContacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div>
                <span className="font-medium text-zinc-200">
                  {c.displayName ?? c.username ?? c.igScopedId}
                </span>
                {c.username && (
                  <span className="ml-2 text-xs text-zinc-500">
                    @{c.username}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500">
                {c.lastMessageAt
                  ? new Date(c.lastMessageAt).toLocaleString()
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
