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

export function readAllResults(): ActionItem[] {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        return JSON.parse(readFileSync(join(RESULTS_DIR, f), "utf8")) as ActionItem[];
      } catch {
        return [];
      }
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
