import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { ActionItem } from "./types";
import { readCompleted } from "./stateStore";

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

  // Load completed IDs from Railway Volume (data/state/completed.json).
  // This set persists across redeploys and cache clears — it's the durable "done" store.
  const completedIds = readCompleted();

  const all = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        return JSON.parse(readFileSync(join(RESULTS_DIR, f), "utf8")) as ActionItem[];
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

  // Deduplicate by stable ID — keep the oldest occurrence; skip completed IDs
  const seenIds = new Set<string>();
  return normalised.filter((item) => {
    if (seenIds.has(item.id)) return false;
    if (completedIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
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
