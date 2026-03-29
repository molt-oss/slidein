"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/keywords", label: "Keywords", icon: "🔑" },
  { href: "/triggers", label: "Comment Triggers", icon: "💬" },
  { href: "/scenarios", label: "Scenarios", icon: "🔄" },
  { href: "/broadcasts", label: "Broadcasts", icon: "📢" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/scoring", label: "Scoring", icon: "⭐" },
  { href: "/automations", label: "Automations", icon: "⚡" },
  { href: "/tracking", label: "Tracking", icon: "🔗" },
  { href: "/webhooks", label: "Webhooks", icon: "🪝" },
  { href: "/conversions", label: "Conversions", icon: "🎯" },
  { href: "/forms", label: "Forms", icon: "📝" },
  { href: "/ai", label: "AI Auto-Reply", icon: "🤖" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 rounded-md bg-zinc-800 p-2 text-zinc-100 md:hidden"
        aria-label="Toggle menu"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-5">
          <span className="text-xl font-bold text-brand-400">slidein</span>
          <span className="text-xs text-zinc-500">admin</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-brand-600/20 text-brand-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4 text-xs text-zinc-600">
          slidein v0.1.0
        </div>
      </aside>
    </>
  );
}
