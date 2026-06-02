const EDIT_KEY = "rcg-item-edits";

export interface ItemEdits {
  actionItem?: string;
  summary?: string;
  priority?: string;
  category?: string;
  client?: string;
  dueDate?: string | null;
  notes?: string;
}

export function getItemEdits(): Record<string, ItemEdits> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EDIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveItemEdit(id: string, edits: ItemEdits): void {
  try {
    const all = getItemEdits();
    all[id] = { ...all[id], ...edits };
    localStorage.setItem(EDIT_KEY, JSON.stringify(all));
  } catch {}
}

export function applyItemEdits<T extends { id: string }>(
  items: T[],
  edits: Record<string, ItemEdits>
): T[] {
  return items.map((item) => {
    const overrides = edits[item.id];
    if (!overrides) return item;
    return { ...item, ...overrides };
  });
}
