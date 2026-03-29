"use client";

import { useState, useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import type { Contact } from "@/lib/api";

export function ContactsClient({
  initialContacts,
}: {
  initialContacts: Contact[];
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    initialContacts.forEach((c) => {
      if (c.tags) {
        c.tags.split(",").forEach((t) => tags.add(t.trim()));
      }
    });
    return Array.from(tags).sort();
  }, [initialContacts]);

  const filtered = useMemo(() => {
    return initialContacts.filter((c) => {
      const matchSearch =
        !search ||
        (c.username?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (c.displayName?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchTag =
        !tagFilter ||
        (c.tags?.split(",").map((t) => t.trim()).includes(tagFilter) ?? false);

      return matchSearch && matchTag;
    });
  }, [initialContacts, search, tagFilter]);

  const columns = [
    {
      key: "displayName",
      label: "Name",
      render: (r: Contact) => (
        <div>
          <span className="font-medium text-zinc-200">
            {r.displayName ?? "—"}
          </span>
          {r.username && (
            <span className="ml-2 text-xs text-zinc-500">@{r.username}</span>
          )}
        </div>
      ),
    },
    {
      key: "tags",
      label: "Tags",
      render: (r: Contact) =>
        r.tags ? (
          <div className="flex flex-wrap gap-1">
            {r.tags.split(",").map((t) => (
              <Badge key={t.trim()}>{t.trim()}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-zinc-600">—</span>
        ),
    },
    {
      key: "lastMessageAt",
      label: "Last Message",
      render: (r: Contact) => (
        <span className="text-xs text-zinc-500">
          {r.lastMessageAt
            ? new Date(r.lastMessageAt).toLocaleString()
            : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: Contact) => (
        <span className="text-xs text-zinc-500">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
        />

        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}

        <span className="text-sm text-zinc-400">
          {filtered.length} contact(s)
        </span>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={filtered}
          keyField="id"
          emptyMessage="No contacts found."
        />
      </div>
    </>
  );
}
