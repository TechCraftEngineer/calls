/**
 * Валидаторы для пользовательских данных
 */

import { z } from "zod";

const emailSchema = z.string().email("Некорректный формат email").max(255);

export interface CreateUserData {
  email: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}

export interface UpdateUserData {
  givenName?: string;
  familyName?: string | null;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
  email?: string | null;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateCreateUserData(data: CreateUserData): void {
  // Валидация email
  if (!data.email || typeof data.email !== "string") {
    throw new ValidationError("Email обязателен и должен быть строкой");
  }

  const trimmed = data.email.trim().toLowerCase();
  if (trimmed.length === 0) {
    throw new ValidationError("Email не может быть пустым");
  }

  const emailResult = emailSchema.safeParse(trimmed);
  if (!emailResult.success) {
    const first = emailResult.error.issues[0];
    throw new ValidationError(
      (first?.message as string) ?? "Введите корректный email адрес",
    );
  }

  // Валидация password
  if (!data.password || typeof data.password !== "string") {
    throw new ValidationError("Пароль обязателен и должен быть строкой");
  }

  if (data.password.length < 8) {
    throw new ValidationError("Пароль должен содержать минимум 8 символов");
  }

  if (data.password.length > 100) {
    throw new ValidationError("Пароль не должен превышать 100 символов");
  }

  // Валидация givenName
  if (!data.givenName || typeof data.givenName !== "string") {
    throw new ValidationError("Имя обязательно и должно быть строкой");
  }

  if (data.givenName.trim().length === 0) {
    throw new ValidationError("Имя не может быть пустым");
  }

  if (data.givenName.length > 100) {
    throw new ValidationError("Имя не должно превышать 100 символов");
  }

  // Валидация familyName
  if (data.familyName !== undefined && data.familyName !== null) {
    if (typeof data.familyName !== "string") {
      throw new ValidationError("Фамилия должна быть строкой");
    }

    if (data.familyName.length > 100) {
      throw new ValidationError("Фамилия не должна превышать 100 символов");
    }
  }

  // Валидация internalExtensions
  if (
    data.internalExtensions !== undefined &&
    data.internalExtensions !== null
  ) {
    if (typeof data.internalExtensions !== "string") {
      throw new ValidationError("Внутренние номера должны быть строкой");
    }

    if (data.internalExtensions.length > 500) {
      throw new ValidationError(
        "Внутренние номера не должны превышать 500 символов",
      );
    }
  }

  // Валидация mobilePhones
  if (data.mobilePhones !== undefined && data.mobilePhones !== null) {
    if (typeof data.mobilePhones !== "string") {
      throw new ValidationError("Мобильные номера должны быть строкой");
    }

    if (data.mobilePhones.length > 500) {
      throw new ValidationError(
        "Мобильные номера не должны превышать 500 символов",
      );
    }
  }

  // Валидация email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== "string") {
      throw new ValidationError("Email должен быть строкой");
    }
    const emailResult = emailSchema.safeParse(data.email.trim());
    if (!emailResult.success) {
      const first = emailResult.error.issues[0];
      throw new ValidationError(
        (first?.message as string) ?? "Некорректный формат email",
      );
    }
  }
}

export function validateUpdateUserData(data: UpdateUserData): void {
  // Валидация givenName
  if (data.givenName !== undefined) {
    if (typeof data.givenName !== "string") {
      throw new ValidationError("Имя должно быть строкой");
    }

    if (data.givenName.trim().length === 0) {
      throw new ValidationError("Имя не может быть пустым");
    }

    if (data.givenName.length > 100) {
      throw new ValidationError("Имя не должно превышать 100 символов");
    }
  }

  // Валидация familyName
  if (data.familyName !== undefined && data.familyName !== null) {
    if (typeof data.familyName !== "string") {
      throw new ValidationError("Фамилия должна быть строкой");
    }

    if (data.familyName.length > 100) {
      throw new ValidationError("Фамилия не должна превышать 100 символов");
    }
  }

  // Валидация internalExtensions
  if (
    data.internalExtensions !== undefined &&
    data.internalExtensions !== null
  ) {
    if (typeof data.internalExtensions !== "string") {
      throw new ValidationError("Внутренние номера должны быть строкой");
    }

    if (data.internalExtensions.length > 500) {
      throw new ValidationError(
        "Внутренние номера не должны превышать 500 символов",
      );
    }
  }

  // Валидация mobilePhones
  if (data.mobilePhones !== undefined && data.mobilePhones !== null) {
    if (typeof data.mobilePhones !== "string") {
      throw new ValidationError("Мобильные номера должны быть строкой");
    }

    if (data.mobilePhones.length > 500) {
      throw new ValidationError(
        "Мобильные номера не должны превышать 500 символов",
      );
    }
  }

  // Валидация email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== "string") {
      throw new ValidationError("Email должен быть строкой");
    }
    const emailResult = emailSchema.safeParse(data.email.trim());
    if (!emailResult.success) {
      const first = emailResult.error.issues[0];
      throw new ValidationError(
        (first?.message as string) ?? "Некорректный формат email",
      );
    }
  }
}
