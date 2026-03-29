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
