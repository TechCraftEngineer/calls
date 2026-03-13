/**
 * Валидаторы для пользовательских данных
 */

export interface CreateUserData {
  username: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
  email?: string | null;
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
  // Валидация username
  if (!data.username || typeof data.username !== "string") {
    throw new ValidationError("Username is required and must be a string");
  }

  if (data.username.trim().length === 0) {
    throw new ValidationError("Username cannot be empty");
  }

  if (data.username.length < 3) {
    throw new ValidationError("Username must be at least 3 characters long");
  }

  if (data.username.length > 50) {
    throw new ValidationError("Username must be less than 50 characters");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    throw new ValidationError(
      "Username can only contain letters, numbers, underscores and hyphens",
    );
  }

  // Валидация password
  if (!data.password || typeof data.password !== "string") {
    throw new ValidationError("Password is required and must be a string");
  }

  if (data.password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  if (data.password.length > 100) {
    throw new ValidationError("Password must be less than 100 characters");
  }

  // Валидация givenName
  if (!data.givenName || typeof data.givenName !== "string") {
    throw new ValidationError("Given name is required and must be a string");
  }

  if (data.givenName.trim().length === 0) {
    throw new ValidationError("Given name cannot be empty");
  }

  if (data.givenName.length > 100) {
    throw new ValidationError("Given name must be less than 100 characters");
  }

  // Валидация familyName
  if (data.familyName !== undefined && data.familyName !== null) {
    if (typeof data.familyName !== "string") {
      throw new ValidationError("Family name must be a string");
    }

    if (data.familyName.length > 100) {
      throw new ValidationError("Family name must be less than 100 characters");
    }
  }

  // Валидация internalExtensions
  if (
    data.internalExtensions !== undefined &&
    data.internalExtensions !== null
  ) {
    if (typeof data.internalExtensions !== "string") {
      throw new ValidationError("Internal extensions must be a string");
    }

    if (data.internalExtensions.length > 500) {
      throw new ValidationError(
        "Internal extensions must be less than 500 characters",
      );
    }
  }

  // Валидация mobilePhones
  if (data.mobilePhones !== undefined && data.mobilePhones !== null) {
    if (typeof data.mobilePhones !== "string") {
      throw new ValidationError("Mobile phones must be a string");
    }

    if (data.mobilePhones.length > 500) {
      throw new ValidationError(
        "Mobile phones must be less than 500 characters",
      );
    }
  }

  // Валидация email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== "string") {
      throw new ValidationError("Email must be a string");
    }

    if (data.email.length > 255) {
      throw new ValidationError("Email must be less than 255 characters");
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      throw new ValidationError("Invalid email format");
    }
  }
}

export function validateUpdateUserData(data: UpdateUserData): void {
  // Валидация givenName
  if (data.givenName !== undefined) {
    if (typeof data.givenName !== "string") {
      throw new ValidationError("Given name must be a string");
    }

    if (data.givenName.trim().length === 0) {
      throw new ValidationError("Given name cannot be empty");
    }

    if (data.givenName.length > 100) {
      throw new ValidationError("Given name must be less than 100 characters");
    }
  }

  // Валидация familyName
  if (data.familyName !== undefined && data.familyName !== null) {
    if (typeof data.familyName !== "string") {
      throw new ValidationError("Family name must be a string");
    }

    if (data.familyName.length > 100) {
      throw new ValidationError("Family name must be less than 100 characters");
    }
  }

  // Валидация internalExtensions
  if (
    data.internalExtensions !== undefined &&
    data.internalExtensions !== null
  ) {
    if (typeof data.internalExtensions !== "string") {
      throw new ValidationError("Internal extensions must be a string");
    }

    if (data.internalExtensions.length > 500) {
      throw new ValidationError(
        "Internal extensions must be less than 500 characters",
      );
    }
  }

  // Валидация mobilePhones
  if (data.mobilePhones !== undefined && data.mobilePhones !== null) {
    if (typeof data.mobilePhones !== "string") {
      throw new ValidationError("Mobile phones must be a string");
    }

    if (data.mobilePhones.length > 500) {
      throw new ValidationError(
        "Mobile phones must be less than 500 characters",
      );
    }
  }

  // Валидация email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== "string") {
      throw new ValidationError("Email must be a string");
    }

    if (data.email.length > 255) {
      throw new ValidationError("Email must be less than 255 characters");
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      throw new ValidationError("Invalid email format");
    }
  }
}
