import { ActionItem, Owner } from "./types";

const KEY = "rcg-owner-overrides";

function safe<T>(fallback: T, fn: () => T): T {
  if (typeof window === "undefined") return fallback;
  try { return fn(); } catch { return fallback; }
}

export function getOwnerOverrides(): Record<string, Owner> {
  return safe({}, () => JSON.parse(localStorage.getItem(KEY) ?? "{}"));
}

export function setOwnerOverride(id: string, owner: Owner): void {
  safe(undefined as void, () => {
    const overrides = getOwnerOverrides();
    overrides[id] = owner;
    localStorage.setItem(KEY, JSON.stringify(overrides));
  });
}

export function applyOwnerOverrides(
  items: ActionItem[],
  overrides: Record<string, Owner>
): ActionItem[] {
  return items.map((item) =>
    overrides[item.id] ? { ...item, owner: overrides[item.id] } : item
  );
}
