import { ActionItem } from "./types";

const ARCHIVE_KEY = "rcg-archive";
const PINS_KEY = "rcg-pins";

export type ArchivedItem = ActionItem & { archivedAt: string };

function safe<T>(fallback: T, fn: () => T): T {
  if (typeof window === "undefined") return fallback;
  try { return fn(); } catch { return fallback; }
}

export function archiveItem(item: ActionItem): void {
  safe(undefined as void, () => {
    const existing = getArchivedItems();
    if (existing.find((i) => i.id === item.id)) return;
    const list: ArchivedItem[] = [...existing, { ...item, archivedAt: new Date().toISOString() }];
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list));
  });
}

export function getArchivedItems(): ArchivedItem[] {
  return safe([], () => JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "[]"));
}

export function getArchivedIds(): Set<string> {
  return new Set(getArchivedItems().map((i) => i.id));
}

export function getDoneThisWeek(): ArchivedItem[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return getArchivedItems()
    .filter((i) => new Date(i.archivedAt).getTime() > weekAgo)
    .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
}

export function getPinnedIds(): Set<string> {
  return safe(new Set<string>(), () =>
    new Set<string>(JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]"))
  );
}

export function togglePin(id: string): Set<string> {
  return safe(new Set<string>(), () => {
    const pins = getPinnedIds();
    pins.has(id) ? pins.delete(id) : pins.add(id);
    localStorage.setItem(PINS_KEY, JSON.stringify([...pins]));
    return new Set(pins);
  });
}
