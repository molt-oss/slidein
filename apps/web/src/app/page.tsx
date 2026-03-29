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

  // Recent contacts sorted by lastMessageAt
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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {hasError && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not connect to Worker API. Showing cached/empty data.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Contacts"
          value={contacts.data.length}
          icon="👥"
        />
        <StatCard
          label="Active Keyword Rules"
          value={activeRules}
          icon="🔑"
        />
        <StatCard
          label="Active Scenarios"
          value={activeScenarios}
          icon="🔄"
        />
      </div>

      {isEmpty && !hasError && (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-200">
            🚀 Getting Started
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Welcome to slidein! Follow these steps to set up your DM automation:
          </p>
          <ol className="mt-4 space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                1
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  Deploy the Worker to Cloudflare
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Configure your Cloudflare account and deploy the Worker with
                  your D1 database.
                </p>
                <a
                  href="https://developers.cloudflare.com/workers/get-started/guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Cloudflare Workers Docs →
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                2
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  Create a Meta App
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Set up a Meta App with Instagram API access and configure your
                  Webhook URL.
                </p>
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Meta Developer Portal →
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                3
              </span>
              <div>
                <p className="font-medium text-zinc-200">
                  Create your first keyword rule
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Set up a keyword rule to automatically respond to DMs
                  containing specific keywords.
                </p>
                <a
                  href="/keywords"
                  className="mt-2 inline-block rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Create Keyword Rule →
                </a>
              </div>
            </li>
          </ol>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-zinc-300">
        Recent Activity
      </h2>
      {recentContacts.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No recent messages.</p>
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
