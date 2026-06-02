const ORDER_KEY = "rcg-week-order";

/** Returns a map of weekKey (YYYY-MM-DD of Monday) → ordered item IDs */
export function getWeekOrders(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Persist a custom order for one week */
export function saveWeekOrder(weekKey: string, ids: string[]): void {
  const all = getWeekOrders();
  all[weekKey] = ids;
  localStorage.setItem(ORDER_KEY, JSON.stringify(all));
}

/** Reset a week to default priority sort */
export function clearWeekOrder(weekKey: string): void {
  const all = getWeekOrders();
  delete all[weekKey];
  localStorage.setItem(ORDER_KEY, JSON.stringify(all));
}

/** Apply a saved order to a list of items; new items (not in saved order) go at the end */
export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const map = new Map(items.map((i) => [i.id, i]));
  const result: T[] = [];
  order.forEach((id) => { const i = map.get(id); if (i) result.push(i); });
  items.forEach((i) => { if (!order.includes(i.id)) result.push(i); });
  return result;
}
