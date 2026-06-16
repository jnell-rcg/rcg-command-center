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

// Pulls server state (source of truth) into localStorage so it survives cache clears
// and works the same across every domain/origin pointed at this app.
export async function syncFromServer(): Promise<void> {
  try {
    const [archiveRes, pinsRes] = await Promise.all([
      fetch("/api/state/archive"),
      fetch("/api/state/pins"),
    ]);
    const archiveData = await archiveRes.json();
    const pinsData = await pinsRes.json();
    writeLocalArchive(archiveData.items ?? []);
    writeLocalPins(new Set<string>(pinsData.ids ?? []));
  } catch {
    // offline or server unreachable — fall back to whatever's already in localStorage
  }
}

export function archiveItem(item: ActionItem): void {
  const existing = readLocalArchive();
  if (existing.find((i) => i.id === item.id)) return;
  const entry: ArchivedItem = { ...item, archivedAt: new Date().toISOString() };
  writeLocalArchive([...existing, entry]);
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
