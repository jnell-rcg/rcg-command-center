import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ActionItem, Priority } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function priorityColor(priority: Priority): string {
  return {
    High: "bg-red-50 border-red-300 text-red-800",
    Medium: "bg-yellow-50 border-yellow-300 text-yellow-800",
    Low: "bg-green-50 border-green-300 text-green-800",
  }[priority];
}

export function priorityBadge(priority: Priority): string {
  return {
    High: "bg-red-100 text-red-700 ring-red-600/20",
    Medium: "bg-yellow-100 text-yellow-700 ring-yellow-600/20",
    Low: "bg-green-100 text-green-700 ring-green-600/20",
  }[priority];
}

export function categoryBadge(category: ActionItem["category"]): string {
  return {
    "Client Response Needed":  "bg-blue-50 text-blue-700 ring-blue-200",
    "New Lead / Sales":        "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "EOS / Accountability":    "bg-violet-50 text-violet-700 ring-violet-200",
    "Payroll & HR":            "bg-pink-50 text-pink-700 ring-pink-200",
    "Month-End Close":         "bg-cyan-50 text-cyan-700 ring-cyan-200",
    "Internal Action Item":    "bg-slate-50 text-slate-600 ring-slate-200",
    "Deadline / Follow-up":    "bg-amber-50 text-amber-700 ring-amber-200",
    "Missing / Overdue Item":  "bg-red-50 text-red-700 ring-red-200",
  }[category] ?? "bg-slate-50 text-slate-600 ring-slate-200";
}

export function sourceBadge(source: ActionItem["source"]): string {
  return {
    Gmail: "bg-blue-100 text-blue-700",
    Calendar: "bg-indigo-100 text-indigo-700",
    Slack: "bg-purple-100 text-purple-700",
    Fathom: "bg-orange-100 text-orange-700",
    WhatsApp: "bg-green-100 text-green-700",
    Dropbox: "bg-blue-100 text-blue-700",
    Manual: "bg-slate-100 text-slate-700",
  }[source];
}

export function formatAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor(ms / 3_600_000);
  if (days >= 7) return `${Math.floor(days / 7)}w ago`;
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}

export function sortByPriority(items: ActionItem[]): ActionItem[] {
  const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  const ownerOrder: Record<string, number> = { Janelle: 0, Rick: 1, Unassigned: 2 };
  return [...items].sort((a, b) => {
    // Overdue always first
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    // Then by priority
    if (priorityOrder[a.priority] !== priorityOrder[b.priority])
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    // Then Janelle before Rick before Unassigned
    return (ownerOrder[a.owner] ?? 2) - (ownerOrder[b.owner] ?? 2);
  });
}
