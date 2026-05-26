"use client";

import { Category, Owner, Priority, Source } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Filters {
  source: Source | "All";
  category: Category | "All";
  owner: Owner | "All";
  priority: Priority | "All";
  client: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  clients: string[];
}

const SOURCES: (Source | "All")[] = ["All", "Gmail", "Calendar", "Slack", "Fathom", "WhatsApp", "Dropbox", "Manual"];
const CATEGORIES: (Category | "All")[] = [
  "All",
  "Client Response Needed",
  "New Lead / Sales",
  "EOS / Accountability",
  "Payroll & HR",
  "Month-End Close",
  "Internal Action Item",
  "Deadline / Follow-up",
  "Missing / Overdue Item",
];
const OWNERS: (Owner | "All")[] = ["All", "Janelle", "Rick", "Zack", "Unassigned"];
const PRIORITIES: (Priority | "All")[] = ["All", "High", "Medium", "Low"];

export function FilterBar({ filters, onChange, clients }: Props) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Select
        label="Source"
        value={filters.source}
        options={SOURCES}
        onChange={(v) => set("source", v as Filters["source"])}
      />
      <Select
        label="Category"
        value={filters.category}
        options={CATEGORIES}
        onChange={(v) => set("category", v as Filters["category"])}
      />
      <Select
        label="Owner"
        value={filters.owner}
        options={OWNERS}
        onChange={(v) => set("owner", v as Filters["owner"])}
      />
      <Select
        label="Priority"
        value={filters.priority}
        options={PRIORITIES}
        onChange={(v) => set("priority", v as Filters["priority"])}
      />
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Client
        </label>
        <select
          value={filters.client}
          onChange={(e) => set("client", e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rcg-500"
        >
          <option value="">All</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() =>
          onChange({ source: "All", category: "All", owner: "All", priority: "All", client: "" })
        }
        className="ml-auto self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
      >
        Clear filters
      </button>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rcg-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
