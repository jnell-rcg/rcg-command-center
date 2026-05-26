"use client";

import { ActionItem, Owner } from "@/lib/types";
import { ActionItemCard } from "./ActionItemCard";

interface Props {
  items: ActionItem[];
  pinnedIds: Set<string>;
  onArchive: (id: string) => void;
  onPin: (id: string) => void;
  onOwnerChange: (id: string, owner: Owner) => void;
}

export function TodaysFocus({ items, pinnedIds, onArchive, onPin, onOwnerChange }: Props) {
  const pinned = items.filter((i) => pinnedIds.has(i.id));
  if (pinned.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 flex-shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Today&apos;s Focus
        </span>
        <span className="text-xs text-amber-500">— {pinned.length} pinned</span>
        <p className="ml-auto text-[11px] text-amber-500">
          Click the bookmark on any card to pin it here
        </p>
      </div>
      <div className="space-y-2">
        {pinned.map((item) => (
          <ActionItemCard
            key={item.id}
            item={item}
            onArchive={onArchive}
            onPin={onPin}
            onOwnerChange={onOwnerChange}
            isPinned={true}
          />
        ))}
      </div>
    </div>
  );
}
