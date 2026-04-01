/**
 * Zod схемы для валидации данных звонков
 */

import { z } from "zod";

/**
 * Схема для валидации UUID
 */
export const uuidSchema = z.string().uuid("Должен быть валидным UUID");

function normalizeTimestamp(value: unknown): unknown {
  if (typeof value === "string" && value.trim()) {
    const v = value.trim();
    const megapbxMatch = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (megapbxMatch) {
      const [, y, mo, d, h, mi, s] = megapbxMatch;
      return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
    }
    return v;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return value;
}

/**
 * Схема для валидации номера телефона
 */
const phoneSchema = z.string().regex(/^\+?[\d\s\-()]+$/, "Номер телефона должен быть валидным");

/**
 * Схема для валидации внутреннего номера
 */
const internalNumberSchema = z
  .string()
  .regex(/^\d+$/, "Внутренний номер должен содержать только цифры")
  .nullable();

/**
 * Схема для валидации направления звонка
 */
const directionSchema = z.enum(["inbound", "outbound"], {
  message: 'direction должен быть "inbound" или "outbound"',
});

/**
 * Схема для валидации статуса звонка
 * Принимает любую строку и позволяет normalizeCallStatus обработать её
 */
const statusSchema = z
  .union([z.enum(["missed", "answered"]), z.string()])
  .nullable()
  .optional();

/**
 * Основная схема для создания звонка
 */
export const createCallSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId обязателен"),
  filename: z.string().min(1, "filename обязателен"),
  provider: z.string().max(50, "provider не должен превышать 50 символов").nullable().optional(),
  externalId: z
    .string()
    .max(100, "externalId не должен превышать 100 символов")
    .nullable()
    .optional(),
  number: phoneSchema.nullable().optional(),
  timestamp: z.preprocess(
    (value) => normalizeTimestamp(value),
    z.string().datetime("timestamp должен быть валидной ISO 8601 датой"),
  ),
  name: z.string().max(100, "name не должен превышать 100 символов").nullable().optional(),
  direction: directionSchema.nullable().optional(),
  status: statusSchema.optional(),
  fileId: uuidSchema.nullable().optional(),
  internalNumber: internalNumberSchema.optional(),
  source: z.string().max(50, "source не должен превышать 50 символов").nullable().optional(),
  customerName: z
    .string()
    .max(200, "customerName не должен превышать 200 символов")
    .nullable()
    .optional(),
});

/**
 * Схема для обновления имени клиента
 */
export const updateCustomerNameSchema = z.object({
  customerName: z.string().max(200, "customerName не должен превышать 200 символов").nullable(),
});

/**
 * Схема для обновления записи звонка
 */
export const updateRecordingSchema = z.object({
  fileId: uuidSchema.nullable(),
});

/**
 * Схема для обновления улучшенного аудио
 */
export const updateEnhancedAudioSchema = z.object({
  enhancedAudioFileId: uuidSchema.nullable(),
});

/**
 * Схема для обновления PBX привязки
 */
export const updatePbxBindingSchema = z.object({
  internalNumber: internalNumberSchema.optional(),
  source: z.string().max(50, "source не должен превышать 50 символов").nullable().optional(),
  name: z.string().max(100, "name не должен превышать 100 символов").nullable().optional(),
});

/**
 * Схема для транзакционного обновления записи звонка
 */
export const updateWithRecordingSchema = z.object({
  fileId: uuidSchema.nullable(),
  enhancedAudioFileId: uuidSchema.nullable().optional(),
  customerName: z
    .string()
    .max(200, "customerName не должен превышать 200 символов")
    .nullable()
    .optional(),
});

/**
 * Схема для транзакционного обновления PBX привязки с именем клиента
 */
export const updatePbxBindingWithCustomerSchema = z.object({
  internalNumber: internalNumberSchema.optional(),
  source: z.string().max(50, "source не должен превышать 50 символов").nullable().optional(),
  name: z.string().max(100, "name не должен превышать 100 символов").nullable().optional(),
  customerName: z
    .string()
    .max(200, "customerName не должен превышать 200 символов")
    .nullable()
    .optional(),
});

/**
 * Типы данных из схем
 */
export type CreateCallInput = z.infer<typeof createCallSchema>;
export type UpdateCustomerNameInput = z.infer<typeof updateCustomerNameSchema>;
export type UpdateRecordingInput = z.infer<typeof updateRecordingSchema>;
export type UpdateEnhancedAudioInput = z.infer<typeof updateEnhancedAudioSchema>;
export type UpdatePbxBindingInput = z.infer<typeof updatePbxBindingSchema>;
export type UpdateWithRecordingInput = z.infer<typeof updateWithRecordingSchema>;
export type UpdatePbxBindingWithCustomerInput = z.infer<typeof updatePbxBindingWithCustomerSchema>;

/**
 * Утилиты для валидации
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Функция для валидации с выбросом ValidationError
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName?: string,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => issue.message).join("; ");
    const fieldPrefix = fieldName ? `${fieldName}: ` : "";
    throw new ValidationError(fieldPrefix + errorMessages, result.error.issues);
  }

  return result.data;
}

export function validateCallId(callId: string): void {
  validateWithSchema(uuidSchema, callId, "callId");
}
