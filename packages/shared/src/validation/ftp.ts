/**
 * Общие утилиты для валидации FTP credentials
 */

export function validateFtpHost(host?: string): { isValid: boolean; error?: string } {
  if (!host || host.trim().length === 0) {
    return { isValid: false, error: "FTP host не может быть пустым" };
  }

  const trimmedHost = host.trim();

  // Проверка IP адреса
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipRegex.test(trimmedHost)) {
    return { isValid: true };
  }

  // Проверка URL/домена
  try {
    new URL(trimmedHost.includes("://") ? trimmedHost : `ftp://${trimmedHost}`);
    return { isValid: true };
  } catch {
    // Проверка формата домена
    if (/^[\w.-]+\.[\w.-]+$/.test(trimmedHost)) {
      return { isValid: true };
    }
  }

  return { isValid: false, error: "Некорректный формат хоста (URL, IP или домен)" };
}

export function validateFtpUser(user?: string): { isValid: boolean; error?: string } {
  if (!user || user.trim().length === 0) {
    return { isValid: false, error: "FTP user не может быть пустым" };
  }

  const trimmedUser = user.trim();
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUser)) {
    return { 
      isValid: false, 
      error: "Имя пользователя может содержать только буквы, цифры, _, -, ." 
    };
  }

  return { isValid: true };
}

export function validateFtpPassword(password?: string): { isValid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { isValid: false, error: "FTP password не может быть пустым" };
  }

  return { isValid: true };
}

export function validateFtpCredentials(
  host?: string,
  user?: string,
  password?: string,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Если хотя бы одно поле заполнено, все должны быть заполнены
  const hasAnyValue = [host, user, password].some((v) => v && v.trim() !== "");
  const hasAllValues = [host, user, password].every(
    (v) => v && v.trim() !== "",
  );

  if (hasAnyValue && !hasAllValues) {
    errors.push("Все поля FTP должны быть заполнены");
    return { isValid: false, errors };
  }

  if (!hasAnyValue) {
    return { isValid: true, errors };
  }

  const hostValidation = validateFtpHost(host);
  if (!hostValidation.isValid && hostValidation.error) {
    errors.push(hostValidation.error);
  }

  const userValidation = validateFtpUser(user);
  if (!userValidation.isValid && userValidation.error) {
    errors.push(userValidation.error);
  }

  const passwordValidation = validateFtpPassword(password);
  if (!passwordValidation.isValid && passwordValidation.error) {
    errors.push(passwordValidation.error);
  }

  return { isValid: errors.length === 0, errors };
}
