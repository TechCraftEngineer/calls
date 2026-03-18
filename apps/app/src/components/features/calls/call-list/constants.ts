import type { ColumnConfig } from "./types";

export const COLUMNS: ColumnConfig[] = [
  {
    key: "type",
    label: "Направление",
    tooltip: "Входящий или исходящий звонок",
    sortKey: "type",
  },
  {
    key: "number",
    label: "Номер",
    tooltip: "Номер абонента и внутренний номер сотрудника",
    sortKey: "number",
  },
  {
    key: "manager",
    label: "Сотрудник",
    tooltip: "Сотрудник, принявший звонок",
    sortKey: "manager",
  },
  {
    key: "status",
    label: "Результат",
    tooltip: "Звонок принят или пропущен",
    sortKey: "status",
  },
  {
    key: "date",
    label: "Дата и время",
    tooltip: "Когда совершён звонок",
    sortKey: "date",
  },
  {
    key: "score",
    label: "Оценка",
    tooltip: "Оценка качества звонка ИИ (1–5 звёзд)",
    sortKey: "score",
  },
  {
    key: "summary",
    label: "Резюме",
    tooltip: "Краткое содержание разговора, составленное ИИ",
    sortKey: "summary",
  },
  {
    key: "analysisCost",
    label: "Стоимость анализа",
    tooltip: "Суммарная стоимость распознавания звонка в рублях",
    sortKey: "analysisCost",
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
    sortKey: "duration",
  },
];

export const COLUMN_ORDER_STORAGE_KEY = "callList_columnOrder:v1";
export const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
