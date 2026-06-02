"use client";

import { ActionItem, Category, Owner, Priority } from "@/lib/types";
import { categoryBadge, cn, formatAge, priorityBadge, priorityColor, sourceBadge } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const OWNERS: Owner[] = ["Janelle", "Rick", "Zack", "Unassigned"];
const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
const CATEGORIES: Category[] = [
  "Client Response Needed",
  "Internal Action Item",
  "EOS / Accountability",
  "Payroll & HR",
  "Month-End Close",
  "Deadline / Follow-up",
  "New Lead / Sales",
  "Missing / Overdue Item",
];

const ownerColor: Record<Owner, string> = {
  Janelle:    "bg-orange-100 text-orange-700",
  Rick:       "bg-teal-50 text-teal-700",
  Zack:       "bg-violet-100 text-violet-700",
  Unassigned: "bg-slate-100 text-slate-500",
};

interface Props {
  item: ActionItem;
  onArchive: (id: string) => void;
  onPin: (id: string) => void;
  onOwnerChange: (id: string, owner: Owner) => void;
  onEdit?: (id: string, edits: Partial<ActionItem>) => void;
  isPinned: boolean;
  archivedAt?: string;
  showDragHandle?: boolean;
}

export function ActionItemCard({
  item,
  onArchive,
  onPin,
  onOwnerChange,
  onEdit,
  isPinned,
  archivedAt,
  showDragHandle,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editText, setEditText] = useState(item.actionItem);
  const [editSummary, setEditSummary] = useState(item.summary);
  const [editPriority, setEditPriority] = useState<Priority>(item.priority);
  const [editCategory, setEditCategory] = useState<Category>(item.category);
  const [editClient, setEditClient] = useState(item.client ?? "");
  const [editDueDate, setEditDueDate] = useState(item.dueDate ?? "");
  const [editNotes, setEditNotes] = useState(item.notes ?? "");

  function openEdit() {
    setEditText(item.actionItem);
    setEditSummary(item.summary);
    setEditPriority(item.priority);
    setEditCategory(item.category);
    setEditClient(item.client ?? "");
    setEditDueDate(item.dueDate ?? "");
    setEditNotes(item.notes ?? "");
    setIsEditing(true);
  }

  function saveEdit() {
    const edits: Partial<ActionItem> = {
      actionItem: editText.trim() || item.actionItem,
      summary: editSummary.trim() || item.summary,
      priority: editPriority,
      category: editCategory,
      client: editClient.trim() || item.client,
      dueDate: editDueDate || undefined,
      notes: editNotes.trim() || undefined,
    };
    onEdit?.(item.id, edits);
    setIsEditing(false);
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 shadow-sm transition-all",
        priorityColor(item.priority),
        item.isOverdue && "ring-2 ring-red-500"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Drag handle */}
        {showDragHandle && (
          <div className="flex-shrink-0 mt-0.5 text-slate-300 cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="5.5" cy="4" r="1.2" />
              <circle cx="10.5" cy="4" r="1.2" />
              <circle cx="5.5" cy="8" r="1.2" />
              <circle cx="10.5" cy="8" r="1.2" />
              <circle cx="5.5" cy="12" r="1.2" />
              <circle cx="10.5" cy="12" r="1.2" />
            </svg>
          </div>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Badge row */}
          <div className="mb-1 flex flex-wrap items-center gap-1">
            {item.isOverdue && (
              <span className="inline-flex items-center rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Overdue
              </span>
            )}
            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset", priorityBadge(item.priority))}>
              {item.priority}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium", sourceBadge(item.source))}>
              {item.source}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset", categoryBadge(item.category))}>
              {item.category}
            </span>
          </div>

          {/* Action item + summary */}
          <p className="text-sm font-semibold leading-snug text-slate-900">{item.actionItem}</p>
          <p className="mt-0.5 text-xs text-slate-500 leading-snug">{item.summary}</p>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
            {/* Owner pill */}
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-600">Owner:</span>
              <span className={cn("relative inline-flex items-center rounded-full text-[9px] font-semibold", ownerColor[item.owner])}>
                <select
                  value={item.owner}
                  onChange={(e) => onOwnerChange(item.id, e.target.value as Owner)}
                  className={cn(
                    "cursor-pointer appearance-none rounded-full py-0.5 pl-1.5 pr-4 text-[9px] font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1",
                    ownerColor[item.owner]
                  )}
                  title="Reassign owner"
                >
                  {OWNERS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-1 h-2 w-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </span>

            {item.client && (
              <span>
                <span className="font-medium text-slate-600">Client:</span> {item.client}
              </span>
            )}
            {item.dueDate && (
              <span>
                <span className="font-medium text-slate-600">Due:</span>{" "}
                {format(parseISO(item.dueDate), "MMM d, yyyy")}
              </span>
            )}
            {archivedAt ? (
              <span className="text-slate-400">Closed {format(parseISO(archivedAt), "MMM d")}</span>
            ) : (
              <span className={cn(
                "tabular-nums",
                (() => {
                  const days = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86_400_000);
                  return days >= 5 ? "font-medium text-orange-600" : "text-slate-400";
                })()
              )}>
                {formatAge(item.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {/* Research notes toggle */}
          {item.notes && !archivedAt && (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              aria-label="Toggle research notes"
              title="Research notes"
              className={cn(
                "rounded-lg p-1.5 transition",
                notesOpen
                  ? "bg-violet-100 text-violet-600"
                  : "text-slate-300 hover:bg-white/50 hover:text-violet-500"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Edit */}
          {!archivedAt && onEdit && (
            <button
              onClick={openEdit}
              aria-label="Edit item"
              className={cn(
                "rounded-lg p-1.5 transition",
                isEditing
                  ? "bg-blue-100 text-blue-600"
                  : "text-slate-300 hover:bg-white/50 hover:text-blue-500"
              )}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.75-6.75a2.121 2.121 0 013 3L12 16H9v-3z" />
              </svg>
            </button>
          )}

          {/* Pin */}
          {!archivedAt && (
            <button
              onClick={() => onPin(item.id)}
              aria-label={isPinned ? "Remove from focus" : "Add to Today's Focus"}
              className={cn(
                "rounded-lg p-1.5 transition",
                isPinned
                  ? "text-amber-500 hover:bg-amber-100"
                  : "text-slate-300 hover:bg-white/50 hover:text-amber-400"
              )}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}

          {/* Mark done */}
          {!archivedAt && (
            <button
              onClick={() => onArchive(item.id)}
              aria-label="Mark done"
              className="rounded-lg p-1.5 text-slate-200 transition hover:bg-white/50 hover:text-emerald-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Research notes panel ── */}
      {item.notes && notesOpen && !isEditing && (
        <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <svg className="h-3 w-3 text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-600">Research Notes</span>
          </div>
          <div className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
            {item.notes}
          </div>
        </div>
      )}

      {/* ── Inline edit form ── */}
      {isEditing && (
        <div className="mt-2.5 rounded-lg border border-blue-200 bg-white/80 px-3 py-2.5 space-y-2">
          {/* Action item text */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Action Item</label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          {/* Summary */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Summary</label>
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          {/* Two-col: priority + category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as Category)}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* Two-col: client + due date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Client</label>
              <input
                type="text"
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                placeholder="e.g. RCG Internal"
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          {/* Research notes */}
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Research Notes <span className="normal-case font-normal text-slate-400">(optional — shown as collapsible reference)</span></label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              placeholder="Paste research, options, links, or context here…"
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          {/* Save / Cancel */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={saveEdit}
              className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
