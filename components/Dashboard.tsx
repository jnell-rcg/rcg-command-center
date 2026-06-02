"use client";

import {
  archiveItem,
  ArchivedItem,
  getArchivedIds,
  getDoneThisWeek,
  getPinnedIds,
  togglePin,
} from "@/lib/archiveStore";
import { applyOwnerOverrides, getOwnerOverrides, setOwnerOverride } from "@/lib/ownerStore";
import { applyOrder, clearWeekOrder, getWeekOrders, saveWeekOrder } from "@/lib/orderStore";
import { applyItemEdits, getItemEdits, ItemEdits, saveItemEdit } from "@/lib/editStore";
import { ActionItem, Owner } from "@/lib/types";
import { cn, sortByPriority } from "@/lib/utils";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionItemCard } from "./ActionItemCard";
import { FilterBar, Filters } from "./FilterBar";
import { SlackUpload } from "./SlackUpload";
import { WhatsAppUpload } from "./WhatsAppUpload";
import { ManualInput } from "./ManualInput";
import { RickJanelle1on1 } from "./RickJanelle1on1";
import { TodaysFocus } from "./TodaysFocus";
import { FinanceAgent } from "./FinanceAgent";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const POLL_INTERVAL_MS = 4_000;

type Section = "ops" | "finance";
type View = "active" | "project" | "week";
type StatusFilter = "active" | "completed";

const DEFAULT_FILTERS: Filters = {
  source: "All",
  category: "All",
  owner: "All",
  priority: "All",
  client: "",
};

export function Dashboard() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("active");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [doneItems, setDoneItems] = useState<ArchivedItem[]>([]);
  const [ownerOverrides, setOwnerOverrides] = useState<Record<string, Owner>>({});
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdits>>({});
  const [section, setSection] = useState<Section>("ops");
  const [rcgInternalOpen, setRcgInternalOpen] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init client-side state from localStorage
  useEffect(() => {
    setPinnedIds(getPinnedIds());
    setDoneItems(getDoneThisWeek());
    setOwnerOverrides(getOwnerOverrides());
    setItemEdits(getItemEdits());
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      const archivedIds = getArchivedIds();
      const overrides = getOwnerOverrides();
      const edits = getItemEdits();
      const active = applyItemEdits(
        applyOwnerOverrides(
          (data.items ?? []).filter((i: ActionItem) => !archivedIds.has(i.id)),
          overrides
        ),
        edits
      );
      setItems(sortByPriority(active));
      setOwnerOverrides(overrides);
      setItemEdits(edits);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPending = useCallback(async () => {
    if (pendingIds.size === 0) return;
    const resolved = new Set<string>();
    await Promise.all(
      [...pendingIds].map(async (id) => {
        const res = await fetch(`/api/check/${id}`);
        const data = await res.json();
        if (data.status === "done") resolved.add(id);
      })
    );
    if (resolved.size > 0) {
      setPendingIds((prev) => {
        const next = new Set(prev);
        resolved.forEach((id) => next.delete(id));
        return next;
      });
      await loadResults();
    }
  }, [pendingIds, loadResults]);

  useEffect(() => {
    loadResults();
    refreshTimer.current = setInterval(loadResults, REFRESH_INTERVAL_MS);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [loadResults]);

  useEffect(() => {
    pollTimer.current = setInterval(checkPending, POLL_INTERVAL_MS);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [checkPending]);

  function addPending(id: string) {
    setPendingIds((prev) => new Set([...prev, id]));
  }

  function handleArchive(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    archiveItem(item);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDoneItems(getDoneThisWeek());
    // Remove from pins if pinned
    setPinnedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      togglePin(id);
      return next;
    });
  }

  function handlePin(id: string) {
    const next = togglePin(id);
    setPinnedIds(new Set(next));
  }

  function handleOwnerChange(id: string, owner: Owner) {
    setOwnerOverride(id, owner);
    const overrides = getOwnerOverrides();
    setOwnerOverrides(overrides);
    setItems((prev) => applyOwnerOverrides(prev, overrides));
  }

  function handleEdit(id: string, edits: Partial<ActionItem>) {
    saveItemEdit(id, edits as ItemEdits);
    const allEdits = getItemEdits();
    setItemEdits(allEdits);
    setItems((prev) => applyItemEdits(prev, allEdits) as ActionItem[]);
  }

  const clients = useMemo(
    () => [...new Set(items.map((i) => i.client).filter(Boolean))].sort() as string[],
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.source !== "All" && item.source !== filters.source) return false;
      if (filters.category !== "All" && item.category !== filters.category) return false;
      if (filters.owner !== "All" && item.owner !== filters.owner) return false;
      if (filters.priority !== "All" && item.priority !== filters.priority) return false;
      if (filters.client && item.client !== filters.client) return false;
      return true;
    });
  }, [items, filters]);

  const counts = useMemo(
    () => ({
      high: items.filter((i) => i.priority === "High").length,
      overdue: items.filter((i) => i.isOverdue).length,
      unassigned: items.filter((i) => i.owner === "Unassigned").length,
    }),
    [items]
  );

  // Recurring patterns: client or category appearing 3+ times
  const { recurringPatterns, flaggedClients } = useMemo(() => {
    const clientCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    items.forEach((item) => {
      if (item.client) clientCounts.set(item.client, (clientCounts.get(item.client) ?? 0) + 1);
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
    });
    const patterns: { text: string; type: "client" | "category" }[] = [];
    const flagged = new Set<string>();
    clientCounts.forEach((count, client) => {
      if (count >= 3) {
        patterns.push({ text: `${client} has ${count} open items — may need a dedicated sync`, type: "client" });
        flagged.add(client);
      }
    });
    categoryCounts.forEach((count, category) => {
      if (count >= 4)
        patterns.push({ text: `${count} "${category}" items open — possible systemic gap`, type: "category" });
    });
    return { recurringPatterns: patterns, flaggedClients: flagged };
  }, [items]);

  // Active Projects view: flagged clients first, then the rest
  const byProject = useMemo(() => {
    const groups = new Map<string, ActionItem[]>();
    filtered.forEach((item) => {
      const key = item.client || "Internal / RCG";
      const g = groups.get(key) ?? [];
      g.push(item);
      groups.set(key, g);
    });
    const entries = [...groups.entries()];
    const flagged = entries.filter(([k]) => flaggedClients.has(k)).sort((a, b) => b[1].length - a[1].length);
    const rest = entries.filter(([k]) => !flaggedClients.has(k)).sort((a, b) => b[1].length - a[1].length);
    return [...flagged, ...rest];
  }, [filtered, flaggedClients]);

  // Group items by calendar week (Monday start), newest first
  const byWeek = useMemo(() => {
    const groups = new Map<string, ActionItem[]>();
    filtered.forEach((item) => {
      const d = new Date(item.createdAt);
      const day = d.getDay(); // 0=Sun
      const daysToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + daysToMonday);
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString().slice(0, 10);
      const g = groups.get(key) ?? [];
      g.push(item);
      groups.set(key, g);
    });
    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, weekItems]) => ({ key, items: sortByPriority(weekItems) }));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Section tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        <button
          onClick={() => setSection("ops")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            section === "ops" ? "bg-[#0d2b2a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Ops Tower
        </button>
        <button
          onClick={() => setSection("finance")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            section === "finance" ? "bg-[#0d2b2a] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          Finance Agent
        </button>
      </div>

      {section === "finance" && <FinanceAgent />}
      {section === "ops" && <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {lastRefresh
            ? `Last refreshed ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Loading…"}
        </p>
        <button
          onClick={loadResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing…" : "Refresh Now"}
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip label={`${filtered.length} active`} color="slate" />
        {pendingIds.size > 0 && <Chip label={`${pendingIds.size} classifying…`} color="blue" />}
        {counts.high > 0 && <Chip label={`${counts.high} High priority`} color="red" />}
        {counts.overdue > 0 && <Chip label={`${counts.overdue} Overdue`} color="red" />}
        {counts.unassigned > 0 && <Chip label={`${counts.unassigned} Unassigned`} color="orange" />}
        {doneItems.length > 0 && (
          <button onClick={() => setStatus("completed")}>
            <Chip label={`${doneItems.length} done this week`} color="green" />
          </button>
        )}
      </div>

      {/* Rick & Janelle 1:1s */}
      <RickJanelle1on1 />

      {/* Today's Focus rail */}
      <TodaysFocus
        items={items}
        pinnedIds={pinnedIds}
        onArchive={handleArchive}
        onPin={handlePin}
        onOwnerChange={handleOwnerChange}
        onEdit={handleEdit}
      />

      {/* Recurring patterns banner */}
      {recurringPatterns.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
              Systemic patterns detected
            </p>
            {flaggedClients.size > 0 && (
              <button
                onClick={() => { setStatus("active"); setView("project"); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-teal-900"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                View Active Projects
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {recurringPatterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-violet-800">
                <span className="mt-0.5 flex-shrink-0 text-violet-400">•</span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input row */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Manual entry */}
        <ManualInput onPending={addPending} />

        <div className="border-t border-slate-100 pt-4 space-y-3">
          {/* Row 1: Auto-sweeps */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Auto Sweep</p>
            <div className="flex flex-wrap gap-2">
              <SweepButton onPending={addPending} onRefresh={loadResults} label="Fathom (14d)" endpoint="/api/fathom-sweep" color="#0d2b2a" />
              <SweepButton onPending={addPending} label="Gmail — Rick & Maria" endpoint="/api/gmail" color="#b91c1c" />
            </div>
          </div>

          {/* Row 2: Manual uploads */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Manual Upload</p>
            <div className="flex flex-wrap items-start gap-2">
              <SlackUpload onPending={addPending} />
              <WhatsAppUpload onPending={addPending} />
            </div>
          </div>
        </div>
      </div>

      {/* Status toggle + view layout + filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Active / Completed toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["active", "completed"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  status === s
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {s === "active" ? "Active" : "Completed"}
              </button>
            ))}
          </div>

          {/* By Owner / Active Projects / By Week — only in active view */}
          {status === "active" && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setView("active")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  view === "active"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                By Owner
              </button>
              <button
                onClick={() => setView("project")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  view === "project"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  Active Projects
                  {flaggedClients.size > 0 && (
                    <span className="rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {flaggedClients.size}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setView("week")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  view === "week"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                By Week
              </button>
            </div>
          )}
        </div>

        {status === "active" && (
          <FilterBar filters={filters} onChange={setFilters} clients={clients} />
        )}
      </div>

      {/* Processing banner */}
      {pendingIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <svg className="h-4 w-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Claude is classifying your items — they&apos;ll appear here automatically when ready.
        </div>
      )}

      {/* ─── RCG INTERNAL DEDICATED SYNC ─── */}
      {status === "active" && (() => {
        const rcgItems = filtered.filter((i) => i.client === "RCG Internal" && !pinnedIds.has(i.id));
        if (rcgItems.length === 0) return null;
        return (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/40 overflow-hidden">
            <button
              onClick={() => setRcgInternalOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ backgroundColor: "#0d2b2a" }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">RCG Internal</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  {rcgItems.length} open
                </span>
                {rcgItems.filter(i => i.priority === "High").length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {rcgItems.filter(i => i.priority === "High").length} High
                  </span>
                )}
                <span className="text-[10px] text-white/40">Dedicated Sync</span>
              </div>
              <svg className={`h-4 w-4 text-white/50 transition-transform ${rcgInternalOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {rcgInternalOpen && (
              <div className="px-4 py-3 space-y-2">
                {sortByPriority(rcgItems).map((item) => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    onArchive={handleArchive}
                    onPin={handlePin}
                    onOwnerChange={handleOwnerChange}
                    onEdit={handleEdit}
                    isPinned={pinnedIds.has(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── COMPLETED VIEW ─── */}
      {status === "completed" && (
        <>
          {doneItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
              <p className="text-sm font-medium">Nothing completed yet this week</p>
              <p className="mt-1 text-xs">Hover a card and click the checkmark to mark it done.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {doneItems.length} item{doneItems.length !== 1 ? "s" : ""} completed in the last 7 days — rolls off after one week.
              </p>
              <div className="space-y-2">
                {doneItems.map((item) => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    onArchive={() => {}}
                    onPin={() => {}}
                    onOwnerChange={handleOwnerChange}
                    isPinned={false}
                    archivedAt={item.archivedAt}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── ACTIVE: BY OWNER ─── */}
      {status === "active" && view === "active" && (
        <>
          {filtered.filter(i => i.client !== "RCG Internal").length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              <OwnerSection
                label="My Items"
                color="text-orange-600"
                items={filtered.filter((i) => i.owner === "Janelle" && i.client !== "RCG Internal")}
                pinnedIds={pinnedIds}
                onArchive={handleArchive}
                onPin={handlePin}
                onOwnerChange={handleOwnerChange}
                onEdit={handleEdit}
              />
              <OwnerSection
                label="Rick's Items"
                color="text-teal-700"
                items={filtered.filter((i) => i.owner === "Rick" && i.client !== "RCG Internal")}
                pinnedIds={pinnedIds}
                onArchive={handleArchive}
                onPin={handlePin}
                onOwnerChange={handleOwnerChange}
                onEdit={handleEdit}
              />
              <OwnerSection
                label="Zack's Items"
                color="text-violet-600"
                items={filtered.filter((i) => i.owner === "Zack" && i.client !== "RCG Internal")}
                pinnedIds={pinnedIds}
                onArchive={handleArchive}
                onPin={handlePin}
                onOwnerChange={handleOwnerChange}
                onEdit={handleEdit}
              />
              <OwnerSection
                label="Unassigned"
                color="text-orange-500"
                items={filtered.filter((i) => i.owner === "Unassigned" && i.client !== "RCG Internal")}
                pinnedIds={pinnedIds}
                onArchive={handleArchive}
                onPin={handlePin}
                onOwnerChange={handleOwnerChange}
                onEdit={handleEdit}
              />
            </div>
          )}
        </>
      )}

      {/* ─── ACTIVE: BY WEEK ─── */}
      {status === "active" && view === "week" && (
        <>
          {byWeek.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Items grouped by the week they were logged. <span className="font-medium text-slate-600">Drag the grip handle</span> on any card to reorder — your order is saved automatically.
              </p>
              {byWeek.map(({ key, items: weekItems }) => (
                <WeekSection
                  key={key}
                  weekKey={key}
                  initialItems={weekItems}
                  pinnedIds={pinnedIds}
                  onArchive={handleArchive}
                  onPin={handlePin}
                  onOwnerChange={handleOwnerChange}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── ACTIVE: ACTIVE PROJECTS ─── */}
      {status === "active" && view === "project" && (
        <>
          {byProject.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {byProject.map(([client, clientItems]) => {
                const isFlagged = flaggedClients.has(client);
                return (
                  <div
                    key={client}
                    className={isFlagged
                      ? "rounded-xl border-2 border-violet-200 bg-violet-50/40 p-4"
                      : "rounded-xl border border-slate-200 bg-white p-4"
                    }
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`text-sm font-bold ${isFlagged ? "text-violet-900" : "text-slate-700"}`}>
                        {client}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isFlagged ? "bg-violet-200 text-violet-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {clientItems.length} open
                      </span>
                      {isFlagged && (
                        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Active Project
                        </span>
                      )}
                      <div className="flex-1 border-t border-slate-200" />
                      {isFlagged && (
                        <span className="text-[11px] text-violet-500">
                          {clientItems.filter(i => i.priority === "High").length} high priority
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {clientItems.map((item) => (
                        <ActionItemCard
                          key={item.id}
                          item={item}
                          onArchive={handleArchive}
                          onPin={handlePin}
                          onOwnerChange={handleOwnerChange}
                          onEdit={handleEdit}
                          isPinned={pinnedIds.has(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </>}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OwnerSection({
  label,
  color,
  items,
  pinnedIds,
  onArchive,
  onPin,
  onOwnerChange,
  onEdit,
}: {
  label: string;
  color: string;
  items: ActionItem[];
  pinnedIds: Set<string>;
  onArchive: (id: string) => void;
  onPin: (id: string) => void;
  onOwnerChange: (id: string, owner: Owner) => void;
  onEdit: (id: string, edits: Partial<ActionItem>) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</span>
        <span className="text-xs text-slate-400">— {items.length}</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ActionItemCard
            key={item.id}
            item={item}
            onArchive={onArchive}
            onPin={onPin}
            onOwnerChange={onOwnerChange}
            onEdit={onEdit}
            isPinned={pinnedIds.has(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
      <p className="text-sm font-medium">No items match your filters</p>
      <p className="mt-1 text-xs">Try clearing filters or upload a transcript to get started.</p>
    </div>
  );
}

function SweepButton({
  onPending, onRefresh, label, endpoint, color,
}: {
  onPending: (id: string) => void;
  onRefresh?: () => void;
  label: string;
  endpoint: string;
  color: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSweep() {
    setLoading(true);
    setDone(false);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sweep failed");
      if (onRefresh) {
        // For sweeps that write directly to results (e.g. Fathom via Claude Code)
        // just refresh results after a short delay rather than polling a pending ID
        setTimeout(() => { onRefresh(); }, 2500);
      } else {
        onPending(data.id);
      }
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleSweep}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60"
        style={{ backgroundColor: color }}
      >
        <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {done ? "✓ Done!" : loading ? "Sweeping…" : label}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── Week Section (drag-to-reorder) ───────────────────────────────────────────

interface WeekSectionProps {
  weekKey: string;           // YYYY-MM-DD of that Monday
  initialItems: ActionItem[];
  pinnedIds: Set<string>;
  onArchive: (id: string) => void;
  onPin: (id: string) => void;
  onOwnerChange: (id: string, owner: Owner) => void;
  onEdit: (id: string, edits: Partial<ActionItem>) => void;
}

function getWeekMeta(weekKey: string): { title: string; subtitle: string } {
  const monday = new Date(weekKey + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMon = new Date(today);
  const dow = today.getDay();
  thisMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const diffWeeks = Math.round((monday.getTime() - thisMon.getTime()) / (7 * 24 * 60 * 60 * 1000));

  let title: string;
  if (diffWeeks === 0) title = "This Week";
  else if (diffWeeks === -1) title = "Last Week";
  else title = format(monday, "MMM d") + " – " + format(sunday, "d");

  const subtitle = format(monday, "MMM d") + " – " + format(sunday, "MMM d, yyyy");
  return { title, subtitle };
}

function WeekSection({ weekKey, initialItems, pinnedIds, onArchive, onPin, onOwnerChange, onEdit }: WeekSectionProps) {
  const [open, setOpen] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [localItems, setLocalItems] = useState<ActionItem[]>(() => {
    const saved = getWeekOrders()[weekKey];
    return saved?.length ? applyOrder(initialItems, saved) : initialItems;
  });

  // Sync when parent items change (archive, owner reassign) while preserving custom order
  useEffect(() => {
    const saved = getWeekOrders()[weekKey];
    if (saved?.length) {
      setLocalItems(applyOrder(initialItems, saved));
    } else {
      setLocalItems(initialItems);
    }
  }, [initialItems, weekKey]);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { reset(); return; }
    const from = localItems.findIndex((i) => i.id === dragId);
    const to = localItems.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) { reset(); return; }
    const next = [...localItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalItems(next);
    saveWeekOrder(weekKey, next.map((i) => i.id));
    reset();
  }

  function reset() { setDragId(null); setDragOverId(null); }

  function resetOrder() {
    clearWeekOrder(weekKey);
    setLocalItems(sortByPriority(initialItems));
  }

  const { title, subtitle } = getWeekMeta(weekKey);
  const highCount = localItems.filter((i) => i.priority === "High").length;
  const overdueCount = localItems.filter((i) => i.isOverdue).length;
  const savedOrder = getWeekOrders()[weekKey];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 flex-wrap text-left flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-800">{title}</span>
          <span className="text-[10px] text-slate-400">{subtitle}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {localItems.length} {localItems.length === 1 ? "item" : "items"}
          </span>
          {highCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              {highCount} High
            </span>
          )}
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {overdueCount} Overdue
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {savedOrder?.length && (
            <button
              onClick={resetOrder}
              className="text-[10px] text-slate-400 hover:text-orange-500 transition underline underline-offset-2"
              title="Reset to priority order"
            >
              Reset order
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)}>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Items */}
      {open && (
        <div className="px-4 py-3 space-y-2">
          {localItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={reset}
              className={cn(
                "rounded-xl transition-all cursor-grab active:cursor-grabbing",
                dragId === item.id && "opacity-40 scale-[0.99]",
                dragOverId === item.id && dragId !== item.id
                  ? "ring-2 ring-orange-400 ring-offset-1"
                  : ""
              )}
            >
              <ActionItemCard
                item={item}
                onArchive={onArchive}
                onPin={onPin}
                onOwnerChange={onOwnerChange}
                onEdit={onEdit}
                isPinned={pinnedIds.has(item.id)}
                showDragHandle
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  color,
}: {
  label: string;
  color: "slate" | "red" | "orange" | "blue" | "green";
}) {
  const cls = {
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
