const STORAGE_KEY = "callListDataGrid_columns:v2";

export const DEFAULT_COLUMN_IDS = [
  "date",
  "number",
  "type",
  "callType",
  "manager",
  "callTopic",
  "sentiment",
  "status",
  "duration",
  "score",
  "summary",
  "record",
] as const;

export type ColumnSchema = {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
};

export function getDefaultSchema(): ColumnSchema {
  return {
    columnOrder: [...DEFAULT_COLUMN_IDS],
    columnVisibility: Object.fromEntries(DEFAULT_COLUMN_IDS.map((id) => [id, true])),
  };
}

function validateAndMerge(saved: ColumnSchema, validIds: Set<string>): ColumnSchema {
  const validOrder = saved.columnOrder.filter((id) => validIds.has(id));
  const missingInOrder = DEFAULT_COLUMN_IDS.filter((id) => !validOrder.includes(id));
  const columnOrder = [...validOrder, ...missingInOrder];

  const columnVisibility: Record<string, boolean> = {};
  for (const id of DEFAULT_COLUMN_IDS) {
    columnVisibility[id] = saved.columnVisibility?.[id] ?? true;
  }

  return { columnOrder, columnVisibility };
}

export function loadColumnSchema(): ColumnSchema {
  if (typeof window === "undefined") return getDefaultSchema();

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getDefaultSchema();

    const parsed = JSON.parse(saved) as ColumnSchema;
    const validIds = new Set(DEFAULT_COLUMN_IDS);

    if (!parsed.columnOrder || !Array.isArray(parsed.columnOrder)) {
      return getDefaultSchema();
    }

    return validateAndMerge(parsed, validIds);
  } catch {
    return getDefaultSchema();
  }
}

export function saveColumnSchema(schema: ColumnSchema): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  } catch (error) {
    console.error("Failed to save column schema to localStorage:", error);
  }
}
