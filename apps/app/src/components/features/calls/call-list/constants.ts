import type { ColumnConfig } from "./types";

export const COLUMNS: ColumnConfig[] = [
  {
    key: "type",
    label: "Направление",
    tooltip: "Входящий или исходящий звонок",
  },
  {
    key: "number",
    label: "Номер",
    tooltip: "Номер абонента и внутренний номер сотрудника",
  },
  {
    key: "manager",
    label: "Сотрудник",
    tooltip: "Сотрудник, принявший звонок",
  },
  {
    key: "status",
    label: "Статус",
    tooltip: "Статус звонка (принят, пропущен, ошибка)",
  },
  {
    key: "date",
    label: "Дата и время",
    tooltip: "Когда совершён звонок",
  },
  {
    key: "score",
    label: "Оценка",
    tooltip: "Оценка качества звонка ИИ (1–5 звёзд)",
  },
  {
    key: "summary",
    label: "Резюме",
    tooltip: "Краткое содержание разговора, составленное ИИ",
  },
  {
    key: "record",
    label: "Запись",
    tooltip: "Нажмите, чтобы прослушать запись разговора",
  },
  {
    key: "duration",
    label: "Длительность",
    tooltip: "Продолжительность разговора",
  },
];

export const COLUMN_ORDER_STORAGE_KEY = "callList_columnOrder:v1";
export const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
