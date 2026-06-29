import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { ActionItem } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const PENDING_DIR = join(DATA_DIR, "pending");
const RESULTS_DIR = join(DATA_DIR, "results");

// Ensure all data directories exist on startup — prevents crashes if folders were deleted
function ensureDirs() {
  [DATA_DIR, PENDING_DIR, RESULTS_DIR, join(DATA_DIR, "sweep-requests")].forEach((d) => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
}
ensureDirs();

export interface PendingRequest {
  id: string;
  source: ActionItem["source"];
  text: string;
  createdAt: string;
}

export function writePending(req: Omit<PendingRequest, "createdAt">): string {
  const payload: PendingRequest = { ...req, createdAt: new Date().toISOString() };
  writeFileSync(join(PENDING_DIR, `${req.id}.json`), JSON.stringify(payload, null, 2), "utf8");
  return req.id;
}

export function writeResult(id: string, items: ActionItem[]): void {
  writeFileSync(join(RESULTS_DIR, `${id}.json`), JSON.stringify(items, null, 2), "utf8");
}

export function readResult(id: string): ActionItem[] | null {
  const path = join(RESULTS_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

// Stable ID: hash the normalized action item text so the same item always
// gets the same ID across re-sweeps. This keeps localStorage archive/pin IDs
// valid — archived items won't reappear after a Fathom refresh.
function stableId(text: string): string {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (Math.imul(31, hash) + normalized.charCodeAt(i)) >>> 0;
  }
  return `stable-${hash.toString(36)}`;
}

export function readAllResults(): ActionItem[] {
  if (!existsSync(RESULTS_DIR)) return [];

  const all = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        const items = JSON.parse(readFileSync(join(RESULTS_DIR, f), "utf8")) as ActionItem[];
        return items.filter((i) => !i.completed);
      } catch {
        return [];
      }
    });

  // Normalise: replace each item's ID with a stable hash of its action text.
  // Same action item text → same ID every time, so archived/pinned items stay
  // matched even after a re-sweep generates a fresh UUID.
  const normalised = all.map((item) => ({
    ...item,
    id: stableId(item.actionItem),
  }));

  // Sort oldest-first so we preserve the original createdAt timestamp when deduping
  normalised.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Deduplicate by stable ID — keep the oldest occurrence
  const seenIds = new Set<string>();
  return normalised.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
}

// Finds the item whose stableId matches and sets completed:true in its source file.
// Returns true if found and written, false if not found.
export function markItemCompleted(id: string): boolean {
  if (!existsSync(RESULTS_DIR)) return false;
  for (const file of readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json"))) {
    const filePath = join(RESULTS_DIR, file);
    try {
      const items = JSON.parse(readFileSync(filePath, "utf8")) as ActionItem[];
      const idx = items.findIndex((item) => stableId(item.actionItem) === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], completed: true };
        writeFileSync(filePath, JSON.stringify(items, null, 2), "utf8");
        return true;
      }
    } catch { continue; }
  }
  return false;
}

// Removes all items with completed:true from every result file.
// Deletes the file entirely if all items are removed.
export function clearAllCompleted(): number {
  if (!existsSync(RESULTS_DIR)) return 0;
  let count = 0;
  for (const file of readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json"))) {
    const filePath = join(RESULTS_DIR, file);
    try {
      const items = JSON.parse(readFileSync(filePath, "utf8")) as ActionItem[];
      const remaining = items.filter((i) => !i.completed);
      if (remaining.length < items.length) {
        count += items.length - remaining.length;
        if (remaining.length === 0) {
          unlinkSync(filePath);
        } else {
          writeFileSync(filePath, JSON.stringify(remaining, null, 2), "utf8");
        }
      }
    } catch { continue; }
  }
  return count;
}

export function listPending(): PendingRequest[] {
  if (!existsSync(PENDING_DIR)) return [];
  return readdirSync(PENDING_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(PENDING_DIR, f), "utf8")) as PendingRequest);
}

export function deletePending(id: string): void {
  const path = join(PENDING_DIR, `${id}.json`);
  if (existsSync(path)) unlinkSync(path);
}
