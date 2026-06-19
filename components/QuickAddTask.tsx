"use client";

import { useState } from "react";

const OWNERS = ["Rick", "Janelle", "Zack", "Unassigned"];
const PRIORITIES = ["High", "Medium", "Low"];
const CATEGORIES = [
  "Internal Action Item",
  "Client Action Item",
  "Deadline / Follow-up",
  "Client Response Needed",
  "New Lead / Sales",
  "Month-End Close",
  "EOS / Accountability",
  "Payroll & HR",
];

interface Props {
  onAdded: () => void;
}

export function QuickAddTask({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [actionItem, setActionItem] = useState("");
  const [owner, setOwner] = useState("Rick");
  const [client, setClient] = useState("");
  const [priority, setPriority] = useState("High");
  const [category, setCategory] = useState("Internal Action Item");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actionItem.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItem, owner, client, priority, category }),
      });
      if (!res.ok) throw new Error("Failed");
      setActionItem("");
      setClient("");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        onAdded();
      }, 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        <span className="text-base leading-none">+</span> Add Task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-bold text-slate-900">Add Task</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Task</label>
                <textarea
                  autoFocus
                  value={actionItem}
                  onChange={(e) => setActionItem(e.target.value)}
                  rows={3}
                  placeholder="What needs to happen?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Owner</label>
                  <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {OWNERS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Client</label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="e.g. SealX, RCG Internal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !actionItem.trim()}
                className="rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {success ? "✓ Added!" : loading ? "Adding…" : "Add Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
