import {
  COLUMN_ORDER_STORAGE_KEY,
  COLUMNS,
  DEFAULT_COLUMN_ORDER,
} from "./constants";

export function loadColumnOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_COLUMN_ORDER;

  try {
    const saved = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!saved) {
      return DEFAULT_COLUMN_ORDER;
    }

    const parsed = JSON.parse(saved) as string[];
    const allKeys = new Set(COLUMNS.map((c) => c.key));
    const savedKeys = new Set(parsed);

    if (
      allKeys.size !== savedKeys.size ||
      !Array.from(allKeys).every((k) => savedKeys.has(k))
    ) {
      return DEFAULT_COLUMN_ORDER;
    }

    const validOrder = parsed.filter((k) => allKeys.has(k));
    const missingKeys = Array.from(allKeys).filter((k) => !savedKeys.has(k));

    return [...validOrder, ...missingKeys];
  } catch {
    return DEFAULT_COLUMN_ORDER;
  }
}

export function saveColumnOrder(order: string[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    console.error("Failed to save column order to localStorage:", error);
  }
}
