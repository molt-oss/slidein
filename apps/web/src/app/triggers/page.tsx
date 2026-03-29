import { fetchCommentTriggers } from "@/lib/api";
import { safeFetch } from "@/lib/safe-fetch";
import type { CommentTrigger } from "@/lib/api";
import { TriggersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function TriggersPage() {
  const { data, error } = await safeFetch<CommentTrigger[]>(
    () => fetchCommentTriggers(),
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Comment Triggers</h1>
      {error && (
        <div className="mt-4 rounded-md border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-400">
          ⚠️ Could not load comment triggers.
        </div>
      )}
      <TriggersClient initialTriggers={data} />
    </div>
  );
}
