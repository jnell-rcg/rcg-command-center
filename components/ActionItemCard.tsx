"use client";

import { ActionItem, Owner } from "@/lib/types";
import { categoryBadge, cn, formatAge, priorityBadge, priorityColor, sourceBadge } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const OWNERS: Owner[] = ["Janelle", "Rick", "Zack", "Unassigned"];

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
  isPinned: boolean;
  archivedAt?: string;
}

export function ActionItemCard({ item, onArchive, onPin, onOwnerChange, isPinned, archivedAt }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-sm transition-all",
        priorityColor(item.priority),
        item.isOverdue && "ring-2 ring-red-500"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: main content */}
        <div className="min-w-0 flex-1">
          {/* Top row: badges */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {item.isOverdue && (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Overdue
              </span>
            )}
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset", priorityBadge(item.priority))}>
              {item.priority}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", sourceBadge(item.source))}>
              {item.source}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset", categoryBadge(item.category))}>
              {item.category}
            </span>
          </div>

          {/* Action item text */}
          <p className="text-sm font-semibold leading-snug text-slate-900">{item.actionItem}</p>
          <p className="mt-0.5 text-xs text-slate-600">{item.summary}</p>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">

            {/* Owner — native select styled as a pill */}
            <span className="flex items-center gap-1">
              <span className="font-medium text-slate-700">Owner:</span>
              <span className={cn("relative inline-flex items-center rounded-full text-[10px] font-semibold", ownerColor[item.owner])}>
                <select
                  value={item.owner}
                  onChange={(e) => onOwnerChange(item.id, e.target.value as Owner)}
                  className={cn(
                    "cursor-pointer appearance-none rounded-full py-0.5 pl-2 pr-5 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1",
                    ownerColor[item.owner]
                  )}
                  title="Reassign owner"
                >
                  {OWNERS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {/* dropdown chevron */}
                <svg className="pointer-events-none absolute right-1.5 h-2.5 w-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </span>

            {item.client && (
              <span>
                <span className="font-medium text-slate-700">Client:</span> {item.client}
              </span>
            )}
            {item.dueDate && (
              <span>
                <span className="font-medium text-slate-700">Due:</span>{" "}
                {format(parseISO(item.dueDate), "MMM d, yyyy")}
              </span>
            )}
            {archivedAt ? (
              <span className="text-slate-400">
                Closed {format(parseISO(archivedAt), "MMM d")}
              </span>
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
        <div className="group flex flex-shrink-0 items-center gap-1">
          {/* Pin / Today's Focus */}
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
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}

          {/* Mark done */}
          {!archivedAt && (
            <button
              onClick={() => onArchive(item.id)}
              aria-label="Mark done"
              className="rounded-lg p-1.5 text-slate-200 transition hover:bg-white/50 hover:text-emerald-600 group-hover:text-slate-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Raw context quote */}
      {item.rawContext && (
        <p className="mt-2 truncate rounded bg-white/40 px-2 py-1 text-[11px] italic text-slate-500">
          &ldquo;{item.rawContext}&rdquo;
        </p>
      )}
    </div>
  );
}
