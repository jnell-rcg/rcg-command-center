import { ActionItem } from "./types";

const ARCHIVE_KEY = "rcg-archive";
const PINS_KEY = "rcg-pins";

export type ArchivedItem = ActionItem & { archivedAt: string };

function safe<T>(fallback: T, fn: () => T): T {
  if (typeof window === "undefined") return fallback;
  try { return fn(); } catch { return fallback; }
}

function readLocalArchive(): ArchivedItem[] {
  return safe([], () => JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "[]"));
}

function writeLocalArchive(list: ArchivedItem[]): void {
  safe(undefined as void, () => localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list)));
}

function readLocalPins(): Set<string> {
  return safe(new Set<string>(), () => new Set<string>(JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]")));
}

function writeLocalPins(pins: Set<string>): void {
  safe(undefined as void, () => localStorage.setItem(PINS_KEY, JSON.stringify([...pins])));
}

// Merges server state into localStorage. Never overwrites local state with an empty
// server response — a stale/empty archive.json will not erase valid local archives.
export async function syncFromServer(): Promise<void> {
  try {
    const [archiveRes, pinsRes] = await Promise.all([
      fetch("/api/state/archive"),
      fetch("/api/state/pins"),
    ]);
    const archiveData = await archiveRes.json();
    const pinsData = await pinsRes.json();

    const serverItems: ArchivedItem[] = archiveData.items ?? [];
    if (serverItems.length > 0) {
      const local = readLocalArchive();
      const byId = new Map(local.map((i) => [i.id, i]));
      for (const s of serverItems) byId.set(s.id, s);
      writeLocalArchive([...byId.values()]);
    }

    const serverPins: string[] = pinsData.ids ?? [];
    if (serverPins.length > 0) {
      writeLocalPins(new Set<string>(serverPins));
    }
  } catch {
    // offline or server unreachable — keep whatever's already in localStorage
  }
}

// Marks an item as complete: writes to localStorage immediately, then writes
// completed:true into the source result file on the server (durable — survives
// cache clears, reloads, and Railway redeploys). Also records in archive.json
// for the "Done This Week" display.
export async function archiveItem(item: ActionItem): Promise<void> {
  const existing = readLocalArchive();
  if (existing.find((i) => i.id === item.id)) return;
  const entry: ArchivedItem = { ...item, archivedAt: new Date().toISOString() };
  writeLocalArchive([...existing, entry]);

  // Write completed:true into the source result file — this is the durable store.
  // If this fails the item will reappear on next load, so we do NOT fire-and-forget.
  try {
    await fetch("/api/results/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
  } catch {
    // Network error — item is still hidden locally this session but may reappear on reload.
    // The archive.json write below also acts as a fallback.
  }

  // Also write to archive.json for Done This Week display (best-effort).
  fetch("/api/state/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  }).catch(() => {});
}

export function getArchivedItems(): ArchivedItem[] {
  return readLocalArchive();
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
  return readLocalPins();
}

export function togglePin(id: string): Set<string> {
  const pins = readLocalPins();
  pins.has(id) ? pins.delete(id) : pins.add(id);
  writeLocalPins(pins);
  fetch("/api/state/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [...pins] }),
  }).catch(() => {});
  return new Set(pins);
}
