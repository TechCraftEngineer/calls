import type { ColumnConfig } from "./types";

export const COLUMNS: ColumnConfig[] = [
  {
    key: "type",
    label: "Тип",
    tooltip: "Направление звонка: Входящий или Исходящий",
    sortKey: "type",
  },
  {
    key: "number",
    label: "Номер клиента",
    tooltip: "Телефонный номер клиента и внутренний номер сотрудника",
    sortKey: "number",
  },
  {
    key: "manager",
    label: "Сотрудник",
    tooltip: "Имя сотрудника, участвовавшего в разговоре",
    sortKey: "manager",
  },
  {
    key: "status",
    label: "Статус",
    tooltip: "Результат звонка: Принят или Пропущен",
    sortKey: "status",
  },
  {
    key: "date",
    label: "Дата",
    tooltip: "Дата и время начала звонка",
    sortKey: "date",
  },
  {
    key: "score",
    label: "Ценность",
    tooltip: "Оценка качества звонка ИИ (от 1 до 5 звезд)",
    sortKey: "score",
  },
  {
    key: "summary",
    label: "Вывод",
    tooltip: "Краткое резюме разговора, составленное ИИ",
    sortKey: "summary",
  },
  {
    key: "record",
    label: "Запись",
    tooltip: "Возможность прослушать аудиозапись разговора",
  },
  {
    key: "duration",
    label: "Длительность",
    tooltip: "Общая продолжительность разговора",
    sortKey: "duration",
  },
];

export const COLUMN_ORDER_STORAGE_KEY = "callList_columnOrder:v1";
export const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
