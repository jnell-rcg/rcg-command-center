import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ActionItem } from "./types";

const STATE_DIR = join(process.cwd(), "data", "state");
const ARCHIVE_FILE = join(STATE_DIR, "archive.json");
const PINS_FILE = join(STATE_DIR, "pins.json");

export type ArchivedItem = ActionItem & { archivedAt: string };

function ensureDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}
ensureDir();

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  ensureDir();
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

export function readArchive(): ArchivedItem[] {
  return readJson<ArchivedItem[]>(ARCHIVE_FILE, []);
}

export function appendArchive(item: ActionItem): ArchivedItem[] {
  const existing = readArchive();
  if (existing.find((i) => i.id === item.id)) return existing;
  const next = [...existing, { ...item, archivedAt: new Date().toISOString() }];
  writeJson(ARCHIVE_FILE, next);
  return next;
}

export function readPins(): string[] {
  return readJson<string[]>(PINS_FILE, []);
}

export function writePins(ids: string[]): string[] {
  writeJson(PINS_FILE, ids);
  return ids;
}

const SWEEP_META_FILE = join(STATE_DIR, "sweep-meta.json");

export function getLastSweepAt(): string | null {
  const meta = readJson<{ lastSweepAt?: string }>(SWEEP_META_FILE, {});
  return meta.lastSweepAt ?? null;
}

export function setLastSweepAt(iso: string): void {
  writeJson(SWEEP_META_FILE, { lastSweepAt: iso });
}
